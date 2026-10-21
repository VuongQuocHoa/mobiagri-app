const prisma = require('../config/db');

const formatDate = (date) => new Date(date).toISOString().slice(0, 10);
const formatDay = (date) => new Date(date).toLocaleDateString('vi-VN');

const getFarmers = async (req, res) => {
  const farmers = await prisma.farmer.findMany({ include: { plots: true }, orderBy: { name: 'asc' } });
  return res.json({ farmers });
};

const getSeasons = async (req, res) => {
  const seasons = await prisma.season.findMany({ include: { plots: true }, orderBy: { harvestDate: 'asc' } });
  return res.json({ seasons: seasons.map((season) => ({ ...season, startDate: formatDay(season.startDate), harvestDate: formatDay(season.harvestDate) })) });
};

const getPlots = async (req, res) => {
  const plots = await prisma.farmerPlot.findMany({ include: { farmer: true, season: true }, orderBy: { createdAt: 'desc' } });
  return res.json({ plots });
};

const getLogs = async (req, res) => {
  const logs = await prisma.cropLog.findMany({ include: { plot: true }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] });
  return res.json({ logs: logs.map((log) => ({ ...log, plotName: log.plot.name, date: formatDate(log.date) })) });
};

const addFarmer = async (req, res) => {
  const { name, phone, address, areaHa, cropType } = req.body || {};
  const area = Number(areaHa);
  if (!name?.trim() || !phone?.trim() || !address?.trim() || !Number.isFinite(area) || area <= 0 || !cropType?.trim()) return res.status(400).json({ message: 'Vui lòng nhập đủ họ tên, số điện thoại, địa chỉ, diện tích và cây trồng.' });
  const farmer = await prisma.farmer.create({ data: { name: name.trim(), phone: phone.trim(), address: address.trim(), areaHa: area, cropType: cropType.trim() } });
  return res.status(201).json({ message: 'Đã thêm hộ dân.', farmer });
};

const addSeason = async (req, res) => {
  const { name, cropType, startDate, harvestDate, expectedYield, status = 'Đang chuẩn bị' } = req.body || {};
  const yieldAmount = Number(expectedYield);
  const start = new Date(startDate);
  const harvest = new Date(harvestDate);
  if (!name?.trim() || !cropType?.trim() || Number.isNaN(start.getTime()) || Number.isNaN(harvest.getTime()) || harvest < start || !Number.isFinite(yieldAmount) || yieldAmount < 0) return res.status(400).json({ message: 'Vui lòng nhập mùa vụ, cây trồng, ngày hợp lệ và sản lượng không âm.' });
  const season = await prisma.season.create({ data: { name: name.trim(), cropType: cropType.trim(), startDate: start, harvestDate: harvest, expectedYield: yieldAmount, status: String(status).trim() || 'Đang chuẩn bị' } });
  return res.status(201).json({ message: 'Đã thêm mùa vụ.', season: { ...season, startDate: formatDay(season.startDate), harvestDate: formatDay(season.harvestDate) } });
};

const addPlot = async (req, res) => {
  const { name, location, cropType, areaHa, latitude, longitude, farmerId, seasonId } = req.body || {};
  const area = Number(areaHa);
  if (!name?.trim() || !cropType?.trim() || !Number.isFinite(area) || area <= 0) return res.status(400).json({ message: 'Vui lòng nhập tên lô, cây trồng và diện tích hợp lệ.' });
  if (farmerId && !await prisma.farmer.findUnique({ where: { id: Number(farmerId) } })) return res.status(400).json({ message: 'Hộ dân không tồn tại.' });
  const plot = await prisma.farmerPlot.create({ data: { name: name.trim(), location: location?.trim() || 'Chưa cập nhật', cropType: cropType.trim(), areaHa: area, status: 'Mới tạo', farmerId: farmerId ? Number(farmerId) : null, seasonId: seasonId ? Number(seasonId) : null, latitude: Number.isFinite(Number(latitude)) ? Number(latitude) : null, longitude: Number.isFinite(Number(longitude)) ? Number(longitude) : null, locationSource: latitude && longitude ? 'GPS thiết bị' : 'Nhập thủ công' } });
  return res.status(201).json({ message: 'Đã thêm lô cây trồng.', plot });
};

const addLog = async (req, res) => {
  const { plotName, plotId, date, activity, item, quantity, notes } = req.body || {};
  if ((!plotName && !plotId) || !date || !activity || !item) return res.status(400).json({ message: 'Thiếu thông tin nhật ký canh tác.' });
  const plot = plotId ? await prisma.farmerPlot.findUnique({ where: { id: Number(plotId) } }) : await prisma.farmerPlot.findUnique({ where: { name: plotName } });
  if (!plot) return res.status(404).json({ message: 'Lô trồng không tồn tại. Hãy chọn lại lô.' });
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return res.status(400).json({ message: 'Ngày thực hiện không hợp lệ.' });
  const log = await prisma.cropLog.create({ data: { plotId: plot.id, date: parsedDate, activity: activity.trim(), item: item.trim(), quantity: quantity?.trim() || '0', notes: notes?.trim() || null }, include: { plot: true } });
  return res.status(201).json({ message: 'Đã lưu nhật ký canh tác.', log: { ...log, plotName: plot.name, date: formatDate(log.date) } });
};

module.exports = { getFarmers, getSeasons, getPlots, getLogs, addFarmer, addSeason, addPlot, addLog };
