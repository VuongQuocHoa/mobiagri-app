import { useEffect, useMemo, useRef, useState } from "react";

const navItems = [
  ["⌂", "Trang chủ", "home"],
  ["♧", "Hộ dân", "farmers"],
  ["▣", "Nhật ký", "logs"],
  ["◌", "Mùa vụ", "seasons"],
  ["☁", "Thời tiết", "weather"],
  ["✦", "Chẩn đoán", "ai"],
  ["◎", "Cộng đồng", "forum"],
];

const secondaryNavItems = [
  ["♧", "Hộ dân", "farmers"],
  ["▣", "Nhật ký", "logs"],
  ["◌", "Mùa vụ", "seasons"],
  ["☁", "Thời tiết", "weather"],
  ["◎", "Cộng đồng", "forum"],
];

function App() {
  const [active, setActive] = useState("home");
  const [farmers, setFarmers] = useState([]);
  const [plots, setPlots] = useState([]);
  const [logs, setLogs] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [weather, setWeather] = useState(null);
  const [weatherAlerts, setWeatherAlerts] = useState([]);
  const [coordinates, setCoordinates] = useState(null);
  const [locationStatus, setLocationStatus] = useState(
    "Đang xin quyền vị trí...",
  );
  const [posts, setPosts] = useState([]);
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [displayStats, setDisplayStats] = useState({
    farmers: 0,
    area: 0,
    logs: 0,
    coverage: 0,
  });
  const statsRef = useRef(null);
  const [voiceNote, setVoiceNote] = useState(false);
  const [photoName, setPhotoName] = useState("");
  const [plotCoordinates, setPlotCoordinates] = useState(null);
  const [logFilter, setLogFilter] = useState("Tất cả");
  const [authToken, setAuthToken] = useState(
    () => localStorage.getItem("mobiagri_token") || "",
  );
  const [authUser, setAuthUser] = useState(null);
  const [loginError, setLoginError] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState("");
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const authHeaders = () =>
    authToken ? { Authorization: `Bearer ${authToken}` } : {};
  const canManageFarm = ["admin", "manager"].includes(authUser?.role);

  const openManagedModal = (name) => {
    if (!authUser) {
      setModal("login");
      setNotice("Vui lòng đăng nhập để nhập dữ liệu vùng nguyên liệu.");
      return;
    }
    if (!canManageFarm) {
      setNotice("Tài khoản của bạn cần quyền quản lý để nhập dữ liệu.");
      return;
    }
    setModal(name);
  };

  const login = async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(
      new FormData(event.currentTarget).entries(),
    );
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok)
      return setLoginError(result.message || "Đăng nhập thất bại.");
    localStorage.setItem("mobiagri_token", result.token);
    setAuthToken(result.token);
    setAuthUser(result.user);
    setModal(null);
    setLoginError("");
    setNotice("Đã đăng nhập.");
  };

  const register = async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(
      new FormData(event.currentTarget).entries(),
    );
    if (body.password !== body.confirmPassword)
      return setLoginError("Mật khẩu xác nhận không khớp.");
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok)
      return setLoginError(result.message || "Đăng ký thất bại.");
    localStorage.setItem("mobiagri_token", result.token);
    setAuthToken(result.token);
    setAuthUser(result.user);
    setModal(null);
    setLoginError("");
    setNotice("Đăng ký thành công. Chào mừng bạn đến với MobiAgri.");
  };

  const logout = () => {
    localStorage.removeItem("mobiagri_token");
    setAuthToken("");
    setAuthUser(null);
    setNotice("Đã đăng xuất.");
  };

  const loadData = async (requestedCoordinates = coordinates) => {
    setLoading(true);
    setLoadError("");
    const weatherQuery = requestedCoordinates
      ? `?latitude=${requestedCoordinates.latitude}&longitude=${requestedCoordinates.longitude}`
      : "";
    const [
      farmerRes,
      plotRes,
      logRes,
      seasonRes,
      weatherRes,
      alertRes,
      forumRes,
    ] = await Promise.all([
      fetch("/api/farm/farmers"),
      fetch("/api/farm/plots"),
      fetch("/api/farm/logs"),
      fetch("/api/farm/seasons"),
      fetch(`/api/weather/forecast${weatherQuery}`),
      fetch(`/api/weather/alerts${weatherQuery}`),
      fetch("/api/forum/posts"),
    ]);
    if (
      [
        farmerRes,
        plotRes,
        logRes,
        seasonRes,
        weatherRes,
        alertRes,
        forumRes,
      ].some((response) => !response.ok)
    )
      throw new Error("API không phản hồi đầy đủ");
    setFarmers((await farmerRes.json()).farmers || []);
    setPlots((await plotRes.json()).plots || []);
    setLogs((await logRes.json()).logs || []);
    setSeasons((await seasonRes.json()).seasons || []);
    const weatherData = await weatherRes.json();
    setWeather(weatherData);
    setLocationStatus(
      weatherData.locationName ||
        weatherData.location ||
        "Chưa xác định địa chỉ",
    );
    setWeatherAlerts((await alertRes.json()).alerts || []);
    setPosts((await forumRes.json()).posts || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("Thiết bị không hỗ trợ GPS · dùng khu vực mặc định");
      loadData().catch((error) => {
        console.error("Không thể tải dữ liệu HTX:", error);
        setLoading(false);
        setLoadError("Không thể tải dữ liệu. Kiểm tra backend rồi thử lại.");
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCoordinates(nextCoordinates);
        setLocationStatus("Đang dùng vị trí thiết bị");
        loadData(nextCoordinates).catch((error) => {
          console.error("Không thể tải dữ liệu HTX:", error);
          setLoading(false);
          setLoadError("Không thể tải dữ liệu. Kiểm tra backend rồi thử lại.");
        });
      },
      () => {
        setLocationStatus("Chưa cấp GPS · dùng khu vực mặc định");
        loadData().catch((error) => {
          console.error("Không thể tải dữ liệu HTX:", error);
          setLoading(false);
          setLoadError("Không thể tải dữ liệu. Kiểm tra backend rồi thử lại.");
        });
      },
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 300000 },
    );
  }, []);

  useEffect(() => {
    if (!authToken) return;
    fetch("/api/auth/me", { headers: authHeaders() })
      .then(async (response) => {
        if (!response.ok) throw new Error("expired");
        setAuthUser((await response.json()).user);
      })
      .catch(() => logout());
  }, [authToken]);

  const requestPlotLocation = () => {
    if (!navigator.geolocation) return setNotice("Thiết bị không hỗ trợ GPS.");
    setNotice("Đang xin quyền vị trí để gắn GPS cho lô...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPlotCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setNotice("Đã lấy vị trí GPS cho lô.");
      },
      () =>
        setNotice(
          "Chưa được cấp quyền GPS. Bạn vẫn có thể lưu lô với khu vực nhập tay.",
        ),
      { enableHighAccuracy: true, timeout: 7000 },
    );
  };

  const totalArea = useMemo(
    () => farmers.reduce((sum, farmer) => sum + farmer.areaHa, 0),
    [farmers],
  );
  const forecast = useMemo(
    () => seasons.reduce((sum, season) => sum + season.expectedYield, 0),
    [seasons],
  );
  const crops = useMemo(
    () => [
      ...new Set([
        ...farmers.map((farmer) => farmer.cropType),
        ...plots.map((plot) => plot.cropType),
        "Cà chua",
        "Lúa",
        "Xoài",
        "Rau cải",
      ]),
    ],
    [farmers, plots],
  );
  const coveredArea = useMemo(
    () => plots.reduce((sum, plot) => sum + plot.areaHa, 0),
    [plots],
  );
  const plotCoverage = totalArea
    ? Math.round((coveredArea / totalArea) * 100)
    : 0;
  const logCoverage = plots.length
    ? Math.min(
        100,
        Math.round(
          (new Set(logs.map((log) => log.plotName)).size / plots.length) * 100,
        ),
      )
    : 0;
  const logTypes = useMemo(
    () => ["Tất cả", ...new Set(logs.map((log) => log.activity))],
    [logs],
  );
  const filteredLogs = useMemo(
    () =>
      logFilter === "Tất cả"
        ? logs
        : logs.filter((log) => log.activity === logFilter),
    [logs, logFilter],
  );

  useEffect(() => {
    if (loading) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        const startedAt = performance.now();
        const duration = 1000;
        const animate = (now) => {
          const progress = Math.min((now - startedAt) / duration, 1);
          const eased = 1 - (1 - progress) ** 3;
          setDisplayStats({
            farmers: Math.round(farmers.length * eased),
            area: Number((coveredArea * eased).toFixed(1)),
            logs: Math.round(logs.length * eased),
            coverage: Math.round(logCoverage * eased),
          });
          if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
        observer.disconnect();
      },
      { threshold: 0.25 },
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, [loading, farmers.length, coveredArea, logs.length, logCoverage]);

  const addLog = async (event) => {
    event.preventDefault();
    if (!authToken) {
      setModal("login");
      setNotice("Vui lòng đăng nhập để ghi nhật ký canh tác.");
      return;
    }
    const body = Object.fromEntries(
      new FormData(event.currentTarget).entries(),
    );
    const response = await fetch("/api/farm/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) return setNotice(result.message);
    setModal(null);
    setNotice("Đã lưu nhật ký canh tác.");
    loadData();
  };

  const addPlot = async (event) => {
    event.preventDefault();
    if (!authToken) {
      setModal("login");
      setNotice("Vui lòng đăng nhập để khai báo lô trồng.");
      return;
    }
    const body = Object.fromEntries(
      new FormData(event.currentTarget).entries(),
    );
    if (plotCoordinates) Object.assign(body, plotCoordinates);
    const response = await fetch("/api/farm/plots", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) return setNotice(result.message);
    setModal(null);
    setNotice("Đã thêm lô vào vùng nguyên liệu.");
    loadData();
  };

  const addFarmer = async (event) => {
    event.preventDefault();
    if (!authToken) {
      setModal("login");
      setNotice("Vui lòng đăng nhập để thêm hộ dân.");
      return;
    }
    const body = Object.fromEntries(
      new FormData(event.currentTarget).entries(),
    );
    const response = await fetch("/api/farm/farmers", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok)
      return setNotice(result.message || "Không thể thêm hộ dân.");
    setModal(null);
    setNotice("Đã thêm hộ dân vào danh sách.");
    loadData();
  };

  const addSeason = async (event) => {
    event.preventDefault();
    if (!authToken) {
      setModal("login");
      setNotice("Vui lòng đăng nhập để thêm mùa vụ.");
      return;
    }
    const body = Object.fromEntries(
      new FormData(event.currentTarget).entries(),
    );
    const response = await fetch("/api/farm/seasons", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok)
      return setNotice(result.message || "Không thể thêm mùa vụ.");
    setModal(null);
    setNotice("Đã thêm mùa vụ và sản lượng dự kiến.");
    loadData();
  };

  const detectDisease = async (event) => {
    event.preventDefault();
    if (!authToken) {
      setModal("login");
      setNotice("Vui lòng đăng nhập để sử dụng chẩn đoán AI.");
      return;
    }
    const formData = new FormData(event.currentTarget);
    const imageFile = formData.get("image");
    const body = Object.fromEntries(formData.entries());
    delete body.image;
    if (imageFile instanceof File && imageFile.size) {
      body.image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
    }
    const response = await fetch("/api/ai/detect", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok)
      return setNotice(result.message || "Không thể chẩn đoán.");
    setAiResult(result);
  };

  const addPost = async (event) => {
    event.preventDefault();
    if (!authToken) {
      setModal("login");
      setNotice("Vui lòng đăng nhập để đăng trao đổi cho cộng đồng.");
      return;
    }
    const body = Object.fromEntries(
      new FormData(event.currentTarget).entries(),
    );
    body.tags = body.tags
      ? body.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];
    const response = await fetch("/api/forum/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) return setNotice(result.message || "Không thể đăng bài.");
    setPosts((current) => [result.post, ...current]);
    event.currentTarget.reset();
    setNotice("Đã đăng trao đổi cho cộng đồng.");
  };

  const addComment = async (event, postId) => {
    event.preventDefault();
    if (!authToken) {
      setModal("login");
      setNotice("Vui lòng đăng nhập để bình luận.");
      return;
    }
    const body = Object.fromEntries(
      new FormData(event.currentTarget).entries(),
    );
    const response = await fetch(`/api/forum/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok)
      return setNotice(result.message || "Không thể thêm bình luận.");
    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? { ...post, comments: [...post.comments, result.comment] }
          : post,
      ),
    );
    event.currentTarget.reset();
  };

  const toggleVoiceNote = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition)
      return setNotice("Thiết bị chưa hỗ trợ nhập bằng giọng nói.");
    if (voiceNote) return setVoiceNote(false);
    const recognition = new SpeechRecognition();
    recognition.lang = "vi-VN";
    recognition.interimResults = false;
    recognition.onstart = () => setVoiceNote(true);
    recognition.onend = () => setVoiceNote(false);
    recognition.onerror = () => {
      setVoiceNote(false);
      setNotice("Không nghe rõ. Bạn thử nói lại nhé.");
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const notes = document.querySelector('[name="notes"]');
      if (notes) notes.value = transcript;
    };
    recognition.start();
  };

  const handlePhoto = (event) => {
    const file = event.target.files?.[0];
    if (file) setPhotoName(file.name);
  };

  const renderAuth = () => (
    <div className="modal-backdrop">
      <form
        className="form-card auth-form"
        onSubmit={authMode === "login" ? login : register}
      >
        <h2>
          {authMode === "login"
            ? "Đăng nhập MobiAgri"
            : "Tạo tài khoản MobiAgri"}
        </h2>
        <p className="form-help">
          {authMode === "login"
            ? "Đăng nhập để ghi dữ liệu và quản lý vùng nguyên liệu."
            : "Tạo tài khoản quản lý để bắt đầu làm việc cùng HTX."}
        </p>
        {authMode === "register" && (
          <input name="name" placeholder="Họ và tên *" required minLength="2" />
        )}
        <input name="email" type="email" placeholder="Email *" required />
        <input
          name="password"
          type="password"
          placeholder="Mật khẩu *"
          required
          minLength="8"
        />
        {authMode === "register" && (
          <input
            name="confirmPassword"
            type="password"
            placeholder="Nhập lại mật khẩu *"
            required
            minLength="8"
          />
        )}
        {loginError && <div className="form-error">{loginError}</div>}
        <div className="auth-form-actions">
          <button
            type="button"
            className="text-button auth-switch"
            onClick={() => {
              setAuthMode(authMode === "login" ? "register" : "login");
              setLoginError("");
            }}
          >
            {authMode === "login"
              ? "Đăng ký tài khoản"
              : "Đã có tài khoản? Đăng nhập"}
          </button>
          <span />
          <button
            type="button"
            className="outline-button"
            onClick={() => setModal(null)}
          >
            Hủy
          </button>
          <button className="form-submit">
            {authMode === "login" ? "Đăng nhập" : "Đăng ký"}
          </button>
        </div>
      </form>
    </div>
  );

  const renderWeather = () => (
    <section className="page-card weather-page">
      <div className="page-title">
        <div>
          <span className="eyebrow">THỜI TIẾT KHU VỰC · {locationStatus}</span>
          <h1>{weather?.location || "Khu vực hiện tại"}</h1>
          <p>{weather?.advisory}</p>
          <small className="data-source">
            Nguồn: {weather?.source || "Open-Meteo"} · cập nhật{" "}
            {weather?.updatedAt
              ? new Date(weather.updatedAt).toLocaleTimeString("vi-VN")
              : "vừa xong"}
          </small>
        </div>
        <button className="main-button" onClick={() => loadData(coordinates)}>
          Cập nhật
        </button>
      </div>
      <div className="weather-current">
        <div>
          <span>HIỆN TẠI</span>
          <strong>
            {weather?.current?.temp ?? weather?.current?.temperature_2m ?? "--"}
            °C
          </strong>
          <small>{weather?.current?.condition || "Đang cập nhật"}</small>
        </div>
        <div>
          <span>MƯA</span>
          <strong>{weather?.current?.precipitation ?? 0} mm</strong>
          <small>
            Gió{" "}
            {Math.round(
              weather?.current?.wind || weather?.current?.wind_speed_10m || 0,
            )}{" "}
            km/h
          </small>
        </div>
        <div className="weather-decision">
          <b>
            {weatherAlerts.length
              ? "Nên hoãn phun thuốc"
              : "Có thể kiểm tra ruộng"}
          </b>
          <small>
            {weatherAlerts.length
              ? "Ưu tiên kiểm tra thoát nước."
              : "Vẫn xem dự báo trước khi phun."}
          </small>
        </div>
      </div>
      <div className="weather-section-heading">
        <div>
          <span className="eyebrow">CẦN HÀNH ĐỘNG</span>
          <h2>Cảnh báo gần nhất</h2>
        </div>
        <span>{weatherAlerts.length} cảnh báo</span>
      </div>
      <div className="alert-list">
        {weatherAlerts.slice(0, 2).map((alert) => (
          <div className="weather-alert" key={alert.id}>
            <strong>
              {alert.type} · {alert.severity}
            </strong>
            <span>{alert.message}</span>
            <small>{alert.advisory}</small>
          </div>
        ))}
        {!weatherAlerts.length && (
          <div className="clear-state">
            Chưa có cảnh báo mưa lớn trong các mốc đang xem.
          </div>
        )}
      </div>
      <div className="weather-section-heading">
        <div>
          <span className="eyebrow">6 MỐC TIẾP THEO</span>
          <h2>Dự báo nhanh</h2>
        </div>
        <span>Chọn mốc để quyết định việc đồng ruộng</span>
      </div>
      <div className="weather-grid">
        {(weather?.forecast || []).slice(0, 6).map((item) => (
          <div className="weather-cell" key={item.time || item.hour}>
            <b>{item.hour}</b>
            <span>{item.condition}</span>
            <strong>{item.temp}°C</strong>
            <small>Mưa {item.rain}%</small>
          </div>
        ))}
      </div>
    </section>
  );

  const renderAi = () => (
    <section className="page-card">
      <div className="page-title">
        <div>
          <span className="eyebrow">HỖ TRỢ CÁN BỘ KỸ THUẬT</span>
          <h1>Chẩn đoán AI cây trồng</h1>
          <p>
            Phân tích triệu chứng hoặc ảnh lá bằng mô hình AI đã cấu hình cho hệ
            thống. Kết quả luôn cần kỹ sư xác minh tại vườn.
          </p>
        </div>
      </div>
      <form className="diagnosis-form" onSubmit={detectDisease}>
        <label>
          Cây trồng
          <select name="cropName" defaultValue={crops[0] || "Cà chua"}>
            {crops.map((crop) => (
              <option key={crop}>{crop}</option>
            ))}
          </select>
        </label>
        <label>
          Tình trạng lá
          <input
            name="leafCondition"
            defaultValue=""
            placeholder="Ví dụ: vàng mép lá, có đốm nâu"
          />
        </label>
        <label>
          Triệu chứng ghi nhận
          <textarea
            name="symptoms"
            placeholder="Mô tả vị trí, mức độ lan rộng và điều kiện thời tiết..."
          />
        </label>
        <label className="ai-upload">
          Ảnh lá cây{" "}
          <input
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
          />
        </label>
        <button className="main-button" type="submit">
          ✦ Phân tích bằng AI
        </button>
      </form>
      {aiResult && (
        <article className="diagnosis-result">
          <span className="season-status">
            Độ tin cậy {Math.round(aiResult.confidence * 100)}%
          </span>
          <h2>{aiResult.diseaseName}</h2>
          <p>
            Mức độ: <b>{aiResult.severity}</b>
          </p>
          {aiResult.evidence && (
            <div>
              <strong>Dấu hiệu AI dùng để nhận định</strong>
              <p>{aiResult.evidence}</p>
            </div>
          )}
          <div>
            <strong>Hướng xử lý tham khảo</strong>
            <p>{aiResult.treatment}</p>
          </div>
          <div>
            <strong>Khuyến nghị thực địa</strong>
            <p>{aiResult.recommendation}</p>
          </div>
          <small>
            {aiResult.aiModel} · {aiResult.source} · {aiResult.disclaimer}
          </small>
        </article>
      )}
    </section>
  );

  const renderForum = () => (
    <section className="page-card">
      <div className="page-title">
        <div>
          <span className="eyebrow">TRAO ĐỔI SẢN XUẤT</span>
          <h1>Cộng đồng HTX</h1>
          <p>
            Nơi cán bộ và bà con ghi nhận vấn đề, kinh nghiệm và cảnh báo ngoài
            đồng.
          </p>
        </div>
      </div>
      <form className="post-form" onSubmit={addPost}>
        <input
          name="title"
          placeholder="Tiêu đề trao đổi *"
          required
          maxLength="160"
        />
        <textarea
          name="content"
          placeholder="Nội dung cần chia sẻ *"
          required
          maxLength="5000"
        />
        <input name="tags" placeholder="Nhãn, cách nhau bằng dấu phẩy" />
        <button className="main-button" type="submit">
          Đăng trao đổi
        </button>
      </form>
      <div className="post-list">
        {posts.map((post) => (
          <article className="post-card" key={post.id}>
            <div>
              <span className="eyebrow">{post.author}</span>
              <h2>{post.title}</h2>
              <p>{post.content}</p>
            </div>
            <div className="comment-list">
              {post.comments?.map((comment) => (
                <p key={comment.id}>
                  <b>{comment.author}:</b> {comment.content}
                </p>
              ))}
            </div>
            <form
              className="comment-form"
              onSubmit={(event) => addComment(event, post.id)}
            >
              <input
                name="content"
                placeholder="Thêm bình luận..."
                required
                maxLength="2000"
              />
              <button type="submit">Gửi</button>
            </form>
          </article>
        ))}
      </div>
    </section>
  );

  const renderAccount = () => (
    <section className="page-card account-page">
      <div className="page-title">
        <div>
          <span className="eyebrow">QUẢN TRỊ TÀI KHOẢN</span>
          <h1>Tài khoản</h1>
          <p>
            Quản lý hồ sơ, quyền truy cập và trạng thái bảo mật của người dùng.
          </p>
        </div>
        {authUser ? (
          <button className="outline-button account-logout" onClick={logout}>
            Đăng xuất
          </button>
        ) : (
          <button className="main-button" onClick={() => setModal("login")}>
            Đăng nhập
          </button>
        )}
      </div>
      {authUser ? (
        <>
          <div className="account-identity">
            <div className="account-avatar">
              {(authUser.name || authUser.email || "M").charAt(0).toUpperCase()}
            </div>
            <div>
              <h2>{authUser.name || "Ban quản lý HTX"}</h2>
              <p>{authUser.email}</p>
              <span className="status">Đang hoạt động</span>
            </div>
          </div>
          <div className="account-grid">
            <article className="account-setting">
              <span className="setting-icon">◈</span>
              <div>
                <b>Thông tin hồ sơ</b>
                <p>Quản lý email và thông tin đại diện của tài khoản.</p>
              </div>
              <button
                className="text-button"
                onClick={() =>
                  setNotice(
                    "Chức năng chỉnh sửa hồ sơ sẽ được mở trong bản cập nhật tiếp theo.",
                  )
                }
              >
                Quản lý
              </button>
            </article>
            <article className="account-setting">
              <span className="setting-icon">⌘</span>
              <div>
                <b>Vai trò và quyền hạn</b>
                <p>
                  Vai trò hiện tại:{" "}
                  <strong>{authUser.role || "Quản lý HTX"}</strong>
                </p>
              </div>
              <span className="setting-readonly">Đã cấp</span>
            </article>
            <article className="account-setting">
              <span className="setting-icon">✓</span>
              <div>
                <b>Bảo mật đăng nhập</b>
                <p>Phiên đăng nhập đang được bảo vệ bằng token xác thực.</p>
              </div>
              <span className="setting-readonly">An toàn</span>
            </article>
          </div>
        </>
      ) : (
        <div className="account-guest">
          <span className="account-guest-icon">🔐</span>
          <h2>Đăng nhập để quản lý tài khoản</h2>
          <p>
            Chỉ tài khoản được cấp quyền mới có thể ghi dữ liệu vùng nguyên liệu
            và trao đổi cộng đồng.
          </p>
          <button className="main-button" onClick={() => setModal("login")}>
            Mở đăng nhập
          </button>
        </div>
      )}
    </section>
  );

  const renderHome = () => (
    <>
      <section className="htx-hero">
        <div className="hero-copy">
          <span className="eyebrow light">
            QUẢN LÝ VÙNG NGUYÊN LIỆU ·{" "}
            {weatherAlerts.length
              ? weatherAlerts[0].type.toUpperCase()
              : "THỜI TIẾT ỔN ĐỊNH"}
          </span>
          <h1>
            Vùng nguyên liệu
            <br />
            <strong>{weather?.location || "Khu vực hiện tại"}</strong>
          </h1>
          <p>
            {weather?.advisory ||
              "Xem nhanh việc cần làm hôm nay và theo dõi mùa vụ của bà con."}
          </p>
        </div>
        <div className="hero-mark">
          🌾<small>MobiAgri</small>
        </div>
      </section>
      <section className="quick-actions">
        <div className="quick-actions-heading">
          <span className="eyebrow">DASHBOARD MỘT CHẠM</span>
          <h2>Việc cần làm hôm nay</h2>
          <p>Chọn một thao tác lớn, không cần đi qua nhiều màn hình.</p>
        </div>
        <div className="quick-action-list">
          <button
            className="one-tap primary-tap"
            onClick={() => openManagedModal("log")}
          >
            <span>📝</span>
            <b>Ghi nhật ký</b>
            <small>Bón phân, phun thuốc</small>
          </button>
          <button
            className="one-tap primary-tap"
            onClick={() => {
              if (!canManageFarm) return openManagedModal("plot");
              openManagedModal("plot");
              requestPlotLocation();
            }}
          >
            <span className="radar-pin">📍</span>
            <b>Thêm lô + GPS</b>
            <small>Chốt diện tích, vị trí</small>
          </button>
          <button
            className="one-tap primary-tap"
            onClick={() => setActive("weather")}
          >
            <span>☁️</span>
            <b>Xem thời tiết</b>
            <small>Quyết định có nên phun</small>
          </button>
          <button
            className="one-tap secondary-tap"
            onClick={() => setActive("farmers")}
          >
            <span>👨‍🌾</span>
            <b>Hộ dân</b>
            <small>Danh sách thành viên</small>
          </button>
          <button
            className="one-tap secondary-tap"
            onClick={() => setActive("seasons")}
          >
            <span>🌱</span>
            <b>Mùa vụ</b>
            <small>Ngày thu hoạch</small>
          </button>
          <button
            className="one-tap secondary-tap"
            onClick={() => (authUser ? logout() : setModal("login"))}
          >
            <span>🔐</span>
            <b>{authUser ? "Đăng xuất" : "Đăng nhập"}</b>
            <small>{authUser ? authUser.email : "Bảo vệ dữ liệu"}</small>
          </button>
        </div>
      </section>
      <div className="kpi-grid" ref={statsRef}>
        <div className="kpi">
          <span>Số hộ đang tham gia</span>
          <b>{displayStats.farmers}</b>
          <small>hộ nông dân</small>
        </div>
        <div className="kpi">
          <span>Diện tích đã định vị</span>
          <b>{displayStats.area.toFixed(1)} ha</b>
          <small>{plotCoverage}% đã vào sổ lô</small>
        </div>
        <div className="kpi">
          <span>Việc đã ghi lại</span>
          <b>{displayStats.logs}</b>
          <small>nhật ký canh tác</small>
        </div>
        <div className="kpi">
          <span>Lô có nhật ký</span>
          <b>{displayStats.coverage}%</b>
          <small>cần cập nhật đúng hạn</small>
        </div>
      </div>
      <section className="control-card">
        <div className="card-heading">
          <div>
            <span className="eyebrow">ĐIỀU PHỐI VÙNG NGUYÊN LIỆU</span>
            <h2>Chỗ nào đang thiếu dữ liệu?</h2>
          </div>
          <button
            className="main-button compact-button"
            onClick={() => openManagedModal("plot")}
          >
            + Thêm lô
          </button>
        </div>
        <div className="control-grid">
          <div>
            <strong>{plots.length}</strong>
            <span>lô đã khai báo</span>
            <small>Gắn diện tích và cây trồng cho từng lô</small>
          </div>
          <div>
            <strong>{Math.max(farmers.length - plots.length, 0)}</strong>
            <span>hộ chưa có lô riêng</span>
            <small>Cần cán bộ đi xác nhận thực địa</small>
          </div>
          <div>
            <strong>
              {Math.max(
                plots.length - new Set(logs.map((log) => log.plotName)).size,
                0,
              )}
            </strong>
            <span>lô chưa có nhật ký</span>
            <small>Nhắc cập nhật bón phân hoặc thu hoạch</small>
          </div>
        </div>
        <div className="plot-progress">
          <div>
            <span>Mức độ nắm bắt diện tích</span>
            <b>{plotCoverage}%</b>
          </div>
          <div className="progress-track">
            <i style={{ width: `${Math.min(plotCoverage, 100)}%` }} />
          </div>
        </div>
      </section>
      <section className="plot-map-card">
        <div className="card-heading">
          <div>
            <span className="eyebrow">GIÁM SÁT VỊ TRÍ</span>
            <h2>Bản đồ lô trồng</h2>
          </div>
          <span className="live-badge">
            <i /> LIVE
          </span>
        </div>
        <div className="map-legend">
          <span>
            <i className="legend-green" /> Có nhật ký
          </span>
          <span>
            <i className="legend-orange" /> Sắp thu hoạch
          </span>
          <span>
            <i className="legend-red" /> Cần cập nhật
          </span>
        </div>
        <div className="plot-map">
          <div className="map-grid-lines" />
          {plots.map((plot, index) => {
            const hasLog = logs.some((log) => log.plotName === plot.name);
            const harvestSoon = seasons.some(
              (season) =>
                season.cropType === plot.cropType &&
                season.status === "Sắp thu hoạch",
            );
            return (
              <button
                className={`map-pin ${harvestSoon ? "harvest-pin" : !hasLog ? "attention-pin" : ""}`}
                style={{
                  left: `${22 + ((index * 27) % 62)}%`,
                  top: `${30 + ((index * 23) % 42)}%`,
                }}
                key={plot.id}
                onClick={() =>
                  setNotice(
                    `${plot.name}: ${plot.areaHa} ha · ${hasLog ? "đã có nhật ký" : "chưa có nhật ký"}${harvestSoon ? " · sắp thu hoạch" : ""}`,
                  )
                }
              >
                <i />
                <span>{plot.name}</span>
              </button>
            );
          })}
          {!plots.length && <p>Chưa có lô nào được định vị.</p>}
        </div>
        <div className="map-summary">
          <strong>{plots.length} lô đang theo dõi</strong>
          <span>
            {
              plots.filter(
                (plot) => !logs.some((log) => log.plotName === plot.name),
              ).length
            }{" "}
            lô cần cập nhật nhật ký
          </span>
        </div>
      </section>
      <section className="farmer-map-board">
        <div className="card-heading">
          <div>
            <span className="eyebrow">HỘ DÂN & THỬA ĐẤT</span>
            <h2>Danh sách cần xử lý</h2>
          </div>
          <button className="text-button" onClick={() => setActive("farmers")}>
            Mở danh sách đầy đủ
          </button>
        </div>
        <div className="farmer-board-list">
          {farmers.map((farmer, index) => {
            const plot = plots[index];
            const hasLog =
              plot && logs.some((log) => log.plotName === plot.name);
            return (
              <button
                key={farmer.id}
                onClick={() =>
                  plot
                    ? setNotice(
                        `${farmer.name} · ${plot.name} · ${plot.areaHa} ha`,
                      )
                    : setActive("farmers")
                }
              >
                <span className="farmer-avatar">{farmer.name.charAt(0)}</span>
                <span>
                  <b>{farmer.name}</b>
                  <small>
                    {farmer.address} · {farmer.areaHa} ha · {farmer.cropType}
                  </small>
                </span>
                <em className={plot && hasLog ? "board-ok" : "board-alert"}>
                  {plot
                    ? hasLog
                      ? "Đã cập nhật"
                      : "Thiếu nhật ký"
                    : "Chưa có lô"}
                </em>
              </button>
            );
          })}
        </div>
      </section>
      <div className="content-two-col">
        <section className="data-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">VIỆC ĐÃ LÀM</span>
              <h2>Nhật ký gần đây</h2>
            </div>
            <button className="text-button" onClick={() => setActive("logs")}>
              Xem thêm
            </button>
          </div>
          {logs.slice(0, 4).map((log) => (
            <div className="activity-row" key={log.id}>
              <span className="activity-icon">✓</span>
              <div>
                <b>{log.activity}</b>
                <small>
                  {log.plotName} · {log.item}
                </small>
              </div>
              <time>{log.date}</time>
            </div>
          ))}
        </section>
        <section className="data-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">SẮP ĐẾN NGÀY THU</span>
              <h2>Mùa vụ sắp tới</h2>
            </div>
            <button
              className="text-button"
              onClick={() => setActive("seasons")}
            >
              Xem thêm
            </button>
          </div>
          {seasons.map((season) => (
            <div className="season-row" key={season.id}>
              <div>
                <b>{season.name}</b>
                <small>
                  {season.cropType} · Thu hoạch {season.harvestDate}
                </small>
              </div>
              <strong>{season.expectedYield} tấn</strong>
            </div>
          ))}
        </section>
      </div>
      <section className="workflow-card">
        <div>
          <span className="eyebrow">CÁCH DÙNG ỨNG DỤNG</span>
          <h2>4 bước đơn giản để quản lý tốt hơn</h2>
        </div>
        <div className="workflow-steps">
          <button type="button" onClick={() => openManagedModal("farmer")}>
            <b>01</b>Nhập hộ dân
          </button>
          <button type="button" onClick={() => openManagedModal("log")}>
            <b>02</b>Ghi việc đã làm
          </button>
          <button type="button" onClick={() => setActive("seasons")}>
            <b>03</b>Xem mùa vụ
          </button>
          <button type="button" onClick={() => setActive("seasons")}>
            <b>04</b>Chuẩn bị sản lượng bán
          </button>
        </div>
      </section>
    </>
  );

  const renderView = () => {
    if (loading)
      return (
        <section className="page-card state-card">
          <strong>Đang tải dữ liệu vùng nguyên liệu...</strong>
          <span>Đang kết nối các phân hệ HTX.</span>
        </section>
      );
    if (loadError)
      return (
        <section className="page-card state-card">
          <strong>{loadError}</strong>
          <button className="main-button" onClick={() => loadData()}>
            Thử tải lại
          </button>
        </section>
      );
    if (active === "home")
      return (
        <div className="view-transition" key="home">
          {renderHome()}
        </div>
      );
    if (active === "farmers")
      return (
        <div className="view-transition">
          <section className="page-card">
            <div className="page-title">
              <div>
                <span className="eyebrow">DANH SÁCH BÀ CON</span>
                <h1>Hộ nông dân</h1>
                <p>Xem diện tích, cây đang trồng và tình trạng của từng hộ.</p>
              </div>
              <div className="page-actions">
                <button className="outline-button" onClick={() => openManagedModal("farmer")}>
                  + Thêm hộ dân
                </button>
                <button className="main-button" onClick={() => openManagedModal("plot")}>
                  + Khai báo lô
                </button>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Họ tên</th>
                    <th>Số điện thoại</th>
                    <th>Địa chỉ</th>
                    <th>Diện tích đăng ký</th>
                    <th>Cây đang trồng</th>
                    <th>Việc cần làm</th>
                  </tr>
                </thead>
                <tbody>
                  {farmers.map((farmer, index) => (
                    <tr key={farmer.id}>
                      <td>
                        <b>{farmer.name}</b>
                      </td>
                      <td>{farmer.phone}</td>
                      <td>{farmer.address}</td>
                      <td>{farmer.areaHa} ha</td>
                      <td>{farmer.cropType}</td>
                      <td>
                        <span
                          className={
                            index < plots.length
                              ? "status"
                              : "status status-warning"
                          }
                        >
                          {index < plots.length
                            ? "Đã có lô"
                            : "Cần xác nhận lô"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      );
    if (active === "logs")
      return (
        <div className="view-transition">
          <section className="page-card logs-page">
            <div className="page-title">
              <div>
                <span className="eyebrow">GHI LẠI VIỆC ĐÃ LÀM</span>
                <h1>Nhật ký canh tác</h1>
                <p>Chọn loại việc để xem nhanh những lô cần theo dõi.</p>
              </div>
              <button className="main-button" onClick={() => openManagedModal("log")}>
                + Ghi việc hôm nay
              </button>
            </div>
            <div className="log-summary">
              <strong>{filteredLogs.length}</strong>
              <span>
                việc{" "}
                {logFilter === "Tất cả"
                  ? "đang được ghi nhận"
                  : `thuộc nhóm ${logFilter.toLowerCase()}`}
              </span>
              <small>Gần nhất: {logs[0]?.date || "chưa có dữ liệu"}</small>
            </div>
            <div className="log-filters" aria-label="Lọc nhật ký">
              {logTypes.map((type) => (
                <button
                  className={logFilter === type ? "active" : ""}
                  onClick={() => setLogFilter(type)}
                  key={type}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="log-table">
              {filteredLogs.map((log) => (
                <div className="full-log" key={log.id}>
                  <span className="date-box">{log.date}</span>
                  <div>
                    <b>
                      {log.activity} · {log.plotName}
                    </b>
                    <small>
                      {log.item} · {log.quantity}
                    </small>
                    <p>{log.notes || "Không có ghi chú"}</p>
                  </div>
                  <span className="safe-label">Đã lưu</span>
                </div>
              ))}
              {!filteredLogs.length && (
                <div className="clear-state">
                  Chưa có nhật ký thuộc nhóm này.
                </div>
              )}
            </div>
          </section>
        </div>
      );
    if (active === "weather")
      return (
        <div className="view-transition" key="weather">
          {renderWeather()}
        </div>
      );
    if (active === "ai")
      return (
        <div className="view-transition" key="ai">
          {renderAi()}
        </div>
      );
    if (active === "forum")
      return (
        <div className="view-transition" key="forum">
          {renderForum()}
        </div>
      );
    if (active === "account")
      return (
        <div className="view-transition" key="account">
          {renderAccount()}
        </div>
      );
    return (
      <div className="view-transition">
        <section className="page-card">
          <div className="page-title">
            <div>
              <span className="eyebrow">KẾ HOẠCH THU HOẠCH</span>
              <h1>Mùa vụ và sản lượng</h1>
              <p>Biết trước sản lượng để HTX chuẩn bị nơi bán và hợp đồng.</p>
            </div>
            <button className="main-button" onClick={() => openManagedModal("season")}>
              + Thêm mùa vụ
            </button>
          </div>
          <div className="forecast-total">
            <span>Tổng sản lượng dự kiến</span>
            <b>{forecast.toFixed(1)} tấn</b>
          </div>
          <div className="season-grid">
            {seasons.map((season) => (
              <article className="season-card" key={season.id}>
                <span className="season-status">{season.status}</span>
                <h2>{season.name}</h2>
                <p>{season.cropType}</p>
                <div className="season-dates">
                  <span>
                    Bắt đầu<strong>{season.startDate}</strong>
                  </span>
                  <span>
                    Dự kiến thu<strong>{season.harvestDate}</strong>
                  </span>
                </div>
                <div className="yield">
                  <span>Sản lượng dự kiến</span>
                  <b>{season.expectedYield} tấn</b>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    );
  };

  return (
    <div className="htx-app">
      <header className="htx-topbar">
        <div className="brand-mark">
          🌱 <b>HTX Bình Mỹ</b>
          <small>Vùng nguyên liệu</small>
        </div>
        <div className="topbar-actions">
          <span className="user-label">
            {authUser ? authUser.email : "Xin chào ban quản lý"}
          </span>
          <button
            className="notice-button"
            aria-label="Xem thông báo"
            onClick={() =>
              setNotice(
                weatherAlerts[0]?.message ||
                  "Hệ thống đang hoạt động bình thường.",
              )
            }
          >
            ♧
          </button>
        </div>
      </header>
      <main>
        <div className="breadcrumb">
          HTX BÌNH MỸ /{" "}
          {active === "account"
            ? "TÀI KHOẢN"
            : navItems.find((item) => item[2] === active)?.[1].toUpperCase()}
        </div>
        {renderView()}
      </main>
      {notice && (
        <button className="toast" onClick={() => setNotice("")}>
          {notice}
        </button>
      )}
      {modal === "farmer" && (
        <div className="modal-backdrop">
          <form className="form-card" onSubmit={addFarmer}>
            <h2>Thêm hộ dân</h2>
            <p className="form-help">Nhập thông tin cơ bản để theo dõi diện tích và cây trồng của hộ.</p>
            <input name="name" placeholder="Họ và tên *" required />
            <input name="phone" type="tel" placeholder="Số điện thoại *" required />
            <input name="address" placeholder="Địa chỉ / khu vực *" required />
            <input name="areaHa" type="number" min="0.01" step="0.01" placeholder="Diện tích đăng ký (ha) *" required />
            <input name="cropType" placeholder="Cây trồng chính *" required />
            <div>
              <button type="button" className="outline-button" onClick={() => setModal(null)}>Hủy</button>
              <button className="form-submit">Lưu hộ dân</button>
            </div>
          </form>
        </div>
      )}
      {modal === "plot" && (
        <div className="modal-backdrop">
          <form className="form-card" onSubmit={addPlot}>
            <h2>Khai báo lô trồng</h2>
            <p className="form-help">
              Mỗi lô cần có diện tích và cây trồng để HTX chốt vùng nguyên liệu.
            </p>
            <input
              name="name"
              placeholder="Tên lô, ví dụ: Lô 04 - Rau cải *"
              required
            />
            <input name="location" placeholder="Ấp / khu vực" />
            <input name="cropType" placeholder="Cây trồng *" required />
            <input
              name="areaHa"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Diện tích (ha) *"
              required
            />
            <div>
              <button
                type="button"
                className="outline-button"
                onClick={() => setModal(null)}
              >
                Hủy
              </button>
              <button className="form-submit">Lưu lô</button>
            </div>
          </form>
        </div>
      )}
      {modal === "log" && (
        <div className="modal-backdrop">
          <form className="form-card log-form" onSubmit={addLog}>
            <h2>Ghi nhật ký nhanh</h2>
            <p className="form-help">
              Chỉ cần chọn, chụp ảnh hoặc nói. Cán bộ sẽ bổ sung sau nếu cần.
            </p>
            <label className="large-field">
              1. Chọn lô trồng
              <select name="plotName" required defaultValue="">
                <option value="" disabled>
                  Chạm để chọn lô *
                </option>
                {plots.map((plot) => (
                  <option value={plot.name} key={plot.id}>
                    {plot.name} · {plot.cropType}
                  </option>
                ))}
              </select>
            </label>
            <label className="large-field">
              2. Việc vừa làm
              <select name="activity" required defaultValue="">
                <option value="" disabled>
                  Chạm để chọn việc *
                </option>
                <option>Bón phân</option>
                <option>Phun thuốc</option>
                <option>Tưới cây</option>
                <option>Thu hoạch</option>
              </select>
            </label>
            <div className="log-tools">
              <label className="tool-button">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhoto}
                />
                📷<b>Chụp ảnh</b>
                <small>{photoName || "Tình trạng cây"}</small>
              </label>
              <button
                type="button"
                className={`tool-button ${voiceNote ? "recording" : ""}`}
                onClick={toggleVoiceNote}
              >
                🎙<b>{voiceNote ? "Đang nghe..." : "Nói ghi chú"}</b>
                <small>Không cần gõ</small>
              </button>
            </div>
            <input
              name="date"
              type="date"
              aria-label="Ngày thực hiện"
              required
            />
            <input name="item" placeholder="Tên phân / thuốc (nếu có)" />
            <input name="quantity" placeholder="Số lượng (nếu có)" />
            <textarea
              name="notes"
              placeholder="Ghi chú thêm hoặc bấm Nói ghi chú"
            ></textarea>
            <div>
              <button
                type="button"
                className="outline-button"
                onClick={() => setModal(null)}
              >
                Hủy
              </button>
              <button className="form-submit">Lưu nhật ký</button>
            </div>
          </form>
        </div>
      )}
      {modal === "season" && (
        <div className="modal-backdrop">
          <form className="form-card" onSubmit={addSeason}>
            <h2>Thêm mùa vụ</h2>
            <p className="form-help">Lập kế hoạch ngày thu hoạch và sản lượng để chuẩn bị đầu ra.</p>
            <input name="name" placeholder="Tên mùa vụ *" required />
            <input name="cropType" placeholder="Cây trồng *" required />
            <label className="large-field">Ngày bắt đầu<input name="startDate" type="date" required /></label>
            <label className="large-field">Ngày dự kiến thu hoạch<input name="harvestDate" type="date" required /></label>
            <input name="expectedYield" type="number" min="0" step="0.1" placeholder="Sản lượng dự kiến (tấn) *" required />
            <select name="status" defaultValue="Đang chuẩn bị"><option>Đang chuẩn bị</option><option>Đang phát triển</option><option>Sắp thu hoạch</option></select>
            <div>
              <button type="button" className="outline-button" onClick={() => setModal(null)}>Hủy</button>
              <button className="form-submit">Lưu mùa vụ</button>
            </div>
          </form>
        </div>
      )}
      {modal === "login" && renderAuth()}
      <nav className="htx-nav">
        <button
          className={active === "home" ? "active" : ""}
          onClick={() => {
            setActive("home");
            setMoreMenuOpen(false);
          }}
        >
          <span>⌂</span>Trang chủ
        </button>
        <button
          className={active === "ai" ? "active" : ""}
          onClick={() => {
            setActive("ai");
            setMoreMenuOpen(false);
          }}
        >
          <span>✦</span>Chẩn đoán
        </button>
        <button
          className={active === "account" ? "active" : ""}
          onClick={() => {
            setActive("account");
            setMoreMenuOpen(false);
          }}
        >
          <span>◎</span>Tài khoản
        </button>
        <button
          className={
            moreMenuOpen ||
            secondaryNavItems.some(([, , key]) => key === active)
              ? "active"
              : ""
          }
          onClick={() => setMoreMenuOpen((current) => !current)}
        >
          <span>•••</span>Thêm
        </button>
      </nav>
      {moreMenuOpen && (
        <div className="more-menu">
          <div className="more-menu-heading">
            <div>
              <span className="eyebrow">PHÂN HỆ QUẢN LÝ</span>
              <b>Các công cụ còn lại</b>
            </div>
            <button
              aria-label="Đóng menu phụ"
              onClick={() => setMoreMenuOpen(false)}
            >
              ×
            </button>
          </div>
          {secondaryNavItems.map(([icon, label, key]) => (
            <button
              key={key}
              className={active === key ? "selected" : ""}
              onClick={() => {
                setActive(key);
                setMoreMenuOpen(false);
              }}
            >
              <span>{icon}</span>
              <b>{label}</b>
              <small>
                {key === "farmers"
                  ? "Danh sách thành viên"
                  : key === "logs"
                    ? "Theo dõi hoạt động"
                    : key === "seasons"
                      ? "Kế hoạch thu hoạch"
                      : key === "weather"
                        ? "Cảnh báo đồng ruộng"
                        : "Trao đổi sản xuất"}
              </small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
