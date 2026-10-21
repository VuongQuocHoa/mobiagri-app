const DEFAULT_LOCATION = { latitude: Number(process.env.DEFAULT_LATITUDE || 10.6686), longitude: Number(process.env.DEFAULT_LONGITUDE || 106.4317), name: process.env.DEFAULT_REGION || 'Khu vực mặc định' };

const parseCoordinates = (query) => {
  const latitude = Number(query.latitude ?? query.lat ?? DEFAULT_LOCATION.latitude);
  const longitude = Number(query.longitude ?? query.lon ?? DEFAULT_LOCATION.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
};

const fetchWeather = async (query) => {
  const coordinates = parseCoordinates(query);
  if (!coordinates) throw new Error('Tọa độ không hợp lệ.');
  const params = new URLSearchParams({ latitude: coordinates.latitude, longitude: coordinates.longitude, forecast_days: '2', timezone: 'auto', current: 'temperature_2m,weather_code,precipitation,wind_speed_10m', hourly: 'temperature_2m,precipitation_probability,weather_code' });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!response.ok) throw new Error('Không thể lấy dữ liệu thời tiết thực tế.');
  const data = await response.json();
  return { data, coordinates };
};

const reverseGeocode = async ({ latitude, longitude }) => {
  try {
    const params = new URLSearchParams({ latitude, longitude, localityLanguage: 'vi' });
    const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${params}`, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return null;
    const data = await response.json();
    const locality = data.city || data.locality || data.principalSubdivision;
    const province = data.principalSubdivision;
    return [...new Set([locality, province].filter(Boolean))].join(', ') || null;
  } catch (error) {
    return null;
  }
};

const conditionFromCode = (code) => {
  const conditions = { 0: 'Trời quang', 1: 'Ít mây', 2: 'Mây rải rác', 3: 'Nhiều mây', 45: 'Sương mù', 48: 'Sương muối', 51: 'Mưa phùn nhẹ', 53: 'Mưa phùn', 55: 'Mưa phùn dày', 56: 'Mưa phùn lạnh nhẹ', 57: 'Mưa phùn lạnh dày', 61: 'Mưa nhẹ', 63: 'Mưa vừa', 65: 'Mưa to', 66: 'Mưa lạnh nhẹ', 67: 'Mưa lạnh to', 71: 'Tuyết nhẹ', 73: 'Tuyết vừa', 75: 'Tuyết to', 77: 'Mưa tuyết', 80: 'Mưa rào nhẹ', 81: 'Mưa rào vừa', 82: 'Mưa rào to', 85: 'Tuyết rào nhẹ', 86: 'Tuyết rào to', 95: 'Dông', 96: 'Dông có mưa đá nhẹ', 99: 'Dông có mưa đá mạnh' };
  return conditions[code] || 'Chưa xác định';
};

const getForecast = async (req, res) => {
  try {
    const { data, coordinates } = await fetchWeather(req.query);
    const currentTime = data.current.time;
    const hours = data.hourly.time.map((time, index) => ({ time, hour: time.slice(11, 16), temp: Math.round(data.hourly.temperature_2m[index]), condition: conditionFromCode(data.hourly.weather_code[index]), rain: data.hourly.precipitation_probability[index] })).filter((item) => item.time >= currentTime).slice(0, 12);
    const currentCondition = conditionFromCode(data.current.weather_code);
    const locationName = await reverseGeocode(coordinates);
    const fallbackLocation = req.query.latitude ? `Vị trí GPS · ${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}` : DEFAULT_LOCATION.name;
    return res.json({ source: 'Open-Meteo · dữ liệu thời tiết trực tiếp', location: locationName || fallbackLocation, locationName, timezone: data.timezone, coordinates, updatedAt: new Date().toISOString(), current: { ...data.current, temp: data.current.temperature_2m, wind: data.current.wind_speed_10m, condition: currentCondition }, forecast: hours, advisory: data.current.precipitation > 0 || currentCondition.includes('Mưa') || currentCondition.includes('Dông') ? 'Đang có mưa hoặc mặt ruộng ẩm, tạm hoãn phun thuốc và kiểm tra thoát nước.' : 'Thời tiết hiện tại phù hợp để kiểm tra ruộng; vẫn xem dự báo mưa trước khi phun thuốc.' });
  } catch (error) {
    return res.status(503).json({ message: 'Không thể lấy dữ liệu thời tiết trực tiếp từ Open-Meteo.', source: 'Open-Meteo', unavailable: true });
  }
};

const getAlerts = async (req, res) => {
  try {
    const { data, coordinates } = await fetchWeather(req.query);
    const alerts = data.hourly.time.map((time, index) => ({ time, rain: data.hourly.precipitation_probability[index], code: data.hourly.weather_code[index] })).filter((item) => item.rain >= 60 || item.code >= 95).slice(0, 3).map((item, index) => ({ id: `weather-${index}-${item.time}`, type: item.code >= 95 ? 'Mưa dông' : 'Mưa lớn', severity: item.rain >= 80 ? 'Cao' : 'Trung bình', message: `${new Date(item.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}: xác suất mưa ${item.rain}%.`, advisory: 'Ngưng phun thuốc, kiểm tra hệ thống tưới và che chắn công trình nhỏ.' }));
    return res.json({ source: 'Open-Meteo · dữ liệu thời tiết trực tiếp', location: req.query.latitude ? 'Vị trí hiện tại' : DEFAULT_LOCATION.name, coordinates, updatedAt: new Date().toISOString(), alerts });
  } catch (error) {
    return res.status(503).json({ message: 'Không thể lấy cảnh báo thời tiết trực tiếp từ Open-Meteo.', source: 'Open-Meteo', unavailable: true });
  }
};

module.exports = { getForecast, getAlerts };
