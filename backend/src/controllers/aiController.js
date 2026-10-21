const getAiConfig = () => ({
  apiKey: process.env.AI_API_KEY || process.env.OPENAI_API_KEY,
  baseUrl: (process.env.AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai').replace(/\/$/, ''),
  model: process.env.AI_MODEL || 'gemini-2.5-flash'
});

const getHealth = (req, res) => {
  const config = getAiConfig();
  res.json({ app: 'MobiAgri AI', status: config.apiKey ? 'configured' : 'not_configured', provider: config.baseUrl, model: config.model, supportedCrops: ['Cà chua', 'Lúa', 'Xoài', 'Rau cải'], description: 'Phân tích triệu chứng và ảnh lá bằng mô hình AI đa phương thức.' });
};

const parseModelJson = (content) => {
  const cleaned = String(content || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('AI trả về định dạng không hợp lệ.');
  return JSON.parse(cleaned.slice(start, end + 1));
};

const detectDisease = async (req, res) => {
  const config = getAiConfig();
  if (!config.apiKey) return res.status(503).json({ message: 'Dịch vụ AI chưa được cấu hình AI_API_KEY.', code: 'AI_NOT_CONFIGURED' });
  const cropName = String(req.body?.cropName || '').trim();
  const leafCondition = String(req.body?.leafCondition || '').trim();
  const symptoms = String(req.body?.symptoms || '').trim();
  const image = req.body?.image;
  if (!cropName || (!leafCondition && !symptoms && !image)) return res.status(400).json({ message: 'Cần nhập triệu chứng hoặc tải ảnh lá cây.' });
  if (image && (!/^data:image\/(jpeg|png|webp);base64,/i.test(image) || image.length > 4_000_000)) return res.status(400).json({ message: 'Ảnh phải là JPEG, PNG hoặc WebP và không vượt quá 3 MB.' });
  const userContent = [{ type: 'text', text: `Cây trồng: ${cropName}\nTình trạng lá: ${leafCondition || 'không cung cấp'}\nTriệu chứng khác: ${symptoms || 'không cung cấp'}` }];
  if (image) userContent.push({ type: 'image_url', image_url: { url: image, detail: 'low' } });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` }, body: JSON.stringify({ model: config.model, temperature: 0.1, max_tokens: 700, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: 'Bạn là trợ lý kỹ thuật cây trồng. Chỉ đưa ra nhận định tham khảo, không kê đơn thuốc. Phân biệt rõ khi không đủ dữ liệu và luôn khuyến nghị kỹ sư nông nghiệp xác minh thực địa. Trả về JSON hợp lệ với các trường diseaseName, confidence (0 đến 1), severity, evidence, treatment, recommendation, disclaimer.' }, { role: 'user', content: userContent }] }), signal: controller.signal });
    if (!response.ok) {
      const providerError = await response.text();
      console.error(`AI provider ${response.status}: ${providerError.slice(0, 500)}`);
      if (response.status === 429) {
        return res.status(429).json({ message: 'Gemini đã hết quota miễn phí. Vui lòng chờ quota reset hoặc dùng API key có billing.', code: 'AI_QUOTA_EXCEEDED' });
      }
      return res.status(502).json({ message: 'Nhà cung cấp AI không phản hồi hợp lệ.', code: 'AI_PROVIDER_ERROR' });
    }
    const payload = await response.json();
    const result = parseModelJson(payload.choices?.[0]?.message?.content);
    const confidence = Math.max(0, Math.min(1, Number(result.confidence) || 0));
    return res.json({ success: true, cropName, ...result, confidence, aiModel: config.model, source: config.baseUrl, generatedAt: new Date().toISOString(), disclaimer: result.disclaimer || 'Kết quả chỉ mang tính tham khảo, cần xác minh tại vườn trước khi xử lý.' });
  } catch (error) {
    if (error.name === 'AbortError') return res.status(504).json({ message: 'Dịch vụ AI phản hồi quá lâu. Vui lòng thử lại.', code: 'AI_TIMEOUT' });
    return res.status(502).json({ message: 'Không thể kết nối dịch vụ AI.', code: 'AI_CONNECTION_ERROR' });
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = { getHealth, detectDisease };
