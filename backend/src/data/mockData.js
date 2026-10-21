const diseaseLibrary = {
  'cà chua': [
    {
      id: 'tomato-blight',
      name: 'Bệnh cháy lá do nấm',
      keyword: 'vàng',
      confidence: 0.94,
      severity: 'Cao',
      treatment: 'Fungicide đồng hữu cơ hoặc chlorothalonil 75WG',
      recommendation: 'Cắt bỏ lá bệnh, tránh tưới trực tiếp lên lá, phun thuốc vào buổi chiều.'
    },
    {
      id: 'tomato-spot',
      name: 'Bệnh đốm lá',
      keyword: 'đốm',
      confidence: 0.9,
      severity: 'Trung bình',
      treatment: 'Bacillus subtilis + thuốc bảo vệ thực vật theo hướng dẫn',
      recommendation: 'Tăng thông thoáng và không để độ ẩm cao trên tán cây.'
    }
  ],
  lúa: [
    {
      id: 'rice-blast',
      name: 'Bệnh đạo ôn',
      keyword: 'đốm',
      confidence: 0.92,
      severity: 'Cao',
      treatment: 'Thuốc trừ bệnh đạo ôn theo khuyến cáo nông dân',
      recommendation: 'Cày bừa, vệ sinh đồng và tránh bón đạm quá mức.'
    }
  ],
  xoài: [
    {
      id: 'mango-anthracnose',
      name: 'Bệnh thán thư xoài',
      keyword: 'nâu',
      confidence: 0.88,
      severity: 'Trung bình',
      treatment: 'Spray thuốc chống nấm có thành phần copper',
      recommendation: 'Tỉa cành và không để khóm quá dày.'
    }
  ],
  'rau cải': [
    {
      id: 'leaf-spot',
      name: 'Bệnh đốm lá rau',
      keyword: 'đốm',
      confidence: 0.87,
      severity: 'Trung bình',
      treatment: 'Thuốc trừ nấm sinh học, phun theo nhịp 5-7 ngày',
      recommendation: 'Thay đất trồng hoặc bổ sung vi sinh đất.'
    }
  ]
};

const weatherForecast = [
  { hour: '06:00', temp: 27, condition: 'Mây mỏng', rain: 10 },
  { hour: '09:00', temp: 31, condition: 'Nắng nhẹ', rain: 15 },
  { hour: '12:00', temp: 34, condition: 'Nắng gắt', rain: 5 },
  { hour: '15:00', temp: 32, condition: 'Mưa rào', rain: 60 },
  { hour: '18:00', temp: 29, condition: 'Mưa dông', rain: 80 },
  { hour: '21:00', temp: 27, condition: 'Mưa nhẹ', rain: 50 }
];

const weatherAlerts = [
  {
    id: 'storm-01',
    type: 'Mưa dông',
    severity: 'Cao',
    message: 'Khu vực hiện tại có khả năng mưa dông trong 3-4 giờ tới.',
    advisory: 'Ngưng phun thuốc, kiểm tra hệ thống tưới và che chắn công trình nhỏ.'
  },
  {
    id: 'rain-02',
    type: 'Mưa lớn',
    severity: 'Trung bình',
    message: 'Mưa lớn có thể làm giảm tỷ lệ phòng trừ sâu bệnh.',
    advisory: 'Lập lịch phun thuốc lại sau khi mưa tạnh.'
  }
];

const farmPlots = [
  { id: 1, name: 'Lô 01 - Cà chua', location: 'Theo GPS hiện tại', cropType: 'Cà chua', areaHa: 1.8, status: 'Đang phát triển' },
  { id: 2, name: 'Lô 02 - Xoài', location: 'Theo GPS hiện tại', cropType: 'Xoài', areaHa: 2.5, status: 'Sắp thu hoạch' },
  { id: 3, name: 'Lô 03 - Rau sạch', location: 'Theo GPS hiện tại', cropType: 'Rau cải', areaHa: 1.2, status: 'Đang chăm sóc' }
];

const farmLogs = [
  { id: 1, plotName: 'Lô 01 - Cà chua', date: '2026-09-09', activity: 'Bón phân', item: 'Phân NPK', quantity: '35 kg', notes: 'Bón sau tưới 1 ngày.' },
  { id: 2, plotName: 'Lô 02 - Xoài', date: '2026-09-08', activity: 'Phun thuốc', item: 'Thuốc sinh học', quantity: '12 lít', notes: 'Phòng bệnh thán thư.' },
  { id: 3, plotName: 'Lô 03 - Rau sạch', date: '2026-09-07', activity: 'Thu hoạch', item: 'Rau cải', quantity: '180 kg', notes: 'Phân loại theo tiêu chuẩn thị trường.' }
];

const htxFarmers = [
  { id: 1, name: 'Nguyễn Văn An', phone: '0901 234 567', address: 'Ấp Bình Hưng', areaHa: 2.5, cropType: 'Xoài cát Hòa Lộc', status: 'Đang canh tác' },
  { id: 2, name: 'Trần Thị Bích', phone: '0912 345 678', address: 'Ấp Bình Phước', areaHa: 1.8, cropType: 'Rau an toàn', status: 'Đang canh tác' },
  { id: 3, name: 'Lê Minh Cường', phone: '0988 765 432', address: 'Ấp Bình Trung', areaHa: 3.2, cropType: 'Xoài cát Hòa Lộc', status: 'Sắp thu hoạch' }
];

const htxSeasons = [
  { id: 1, name: 'Vụ xoài Đông Xuân 2026', cropType: 'Xoài cát Hòa Lộc', startDate: '15/10/2025', harvestDate: '20/03/2026', expectedYield: 18.5, status: 'Sắp thu hoạch' },
  { id: 2, name: 'Vụ rau an toàn tháng 3', cropType: 'Rau an toàn', startDate: '01/03/2026', harvestDate: '30/03/2026', expectedYield: 6.2, status: 'Đang sản xuất' }
];

const forumPosts = [
  {
    id: 1,
    author: 'Anh Hưng',
    title: 'Cây cà chua bị vàng lá sau mưa lớn',
    content: 'Tôi đang trồng cà chua lô 01 và thấy lá có màu vàng, có vẻ bị bệnh. Ai có kinh nghiệm không?',
    tags: ['cà chua', 'bệnh', 'mưa'],
    comments: [
      { id: 101, author: 'Chuyên gia A', content: 'Nên kiểm tra sâu rễ và tránh tưới quá nhiều nước.', createdAt: '2026-09-09' },
      { id: 102, author: 'Bà Lan', content: 'Có thể phun thuốc theo hướng dẫn của nhà nông địa phương.', createdAt: '2026-09-09' }
    ]
  },
  {
    id: 2,
    author: 'Chị Mai',
    title: 'Lịch bón phân cho xoài mùa mưa',
    content: 'Mình muốn hỏi lịch bón phân cho xoài trong thời gian mưa nhiều, ai có kinh nghiệm chia sẻ.',
    tags: ['xoài', 'bón phân'],
    comments: [
      { id: 201, author: 'Kỹ sư nông nghiệp', content: 'Nên bón phân theo giai đoạn nở hoa và giảm bón khi trời mưa quá lâu.', createdAt: '2026-09-08' }
    ]
  }
];

module.exports = {
  diseaseLibrary,
  weatherForecast,
  weatherAlerts,
  farmPlots,
  farmLogs,
  forumPosts
  , htxFarmers
  , htxSeasons
};
