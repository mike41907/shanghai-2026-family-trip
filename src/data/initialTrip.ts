import type {
  ItineraryItem,
  Restaurant,
  TransitSegment,
  TripDay,
  TripDocument,
  TripTask
} from "../types";

const item = (
  id: string,
  startTime: string,
  title: string,
  extra: Omit<Partial<ItineraryItem>, "id" | "startTime" | "title"> = {}
): ItineraryItem => ({ id, startTime, title, ...extra });

const segment = (
  id: string,
  from: string,
  to: string,
  mode: TransitSegment["mode"],
  detail?: string,
  duration?: string
): TransitSegment => ({ id, from, to, mode, detail, duration });

const tasks: TripTask[] = [
  { id: "task-passport", title: "確認護照與台胞證", category: "證件", completed: false },
  { id: "task-sim", title: "準備網卡／中國門號", category: "網路", completed: false },
  { id: "task-charger", title: "準備充電器、轉接頭與行動電源", category: "行李", completed: false },
  { id: "task-medicine", title: "準備常備藥品", category: "行李", completed: false },
  { id: "task-tickets", title: "確認機票、訂位與付款資料", category: "行程", completed: false },
  { id: "task-checkout", title: "退房、確認房間並取回行李", category: "返程", completed: false }
];

const day = (
  dayNumber: number,
  date: string,
  title: string,
  overview: string,
  items: ItineraryItem[],
  transitSegments: TransitSegment[]
): TripDay => ({
  id: `day-${dayNumber}`,
  dayNumber,
  date,
  title,
  overview,
  items,
  transitSegments
});

const restaurants: Restaurant[] = [
  {
    id: "restaurant-guanguanji",
    name: "貫貫吉",
    category: "新疆菜",
    area: "待確認",
    businessHours: "待補資料",
    notes: "先保留口袋名單，請以美團分店資訊為準。"
  },
  {
    id: "restaurant-lailai-jingan",
    name: "萊萊小籠（靜安店）",
    category: "小籠包",
    area: "靜安",
    businessHours: "待補資料",
    notes: "靜安店；實際門牌與營業時間待確認。"
  },
  {
    id: "restaurant-laoruifu-renmin",
    name: "老瑞福（人民廣場店）",
    category: "本幫菜",
    address: "上海市黃浦區鳳陽路238號",
    area: "人民廣場",
    businessHours: "待確認",
    notes: "Day 5 正式安排的本幫菜。"
  },
  {
    id: "restaurant-yuanyuan-xingguo",
    name: "圓苑（興國路店）",
    category: "本幫菜",
    address: "上海市徐匯區興國路201號（近泰安路）",
    phone: "+86-21-64339123",
    area: "徐匯／衡復",
    businessHours: "11:00–21:30",
    notes: "Day 2 午餐正式安排。"
  },
  {
    id: "restaurant-yuxingji",
    name: "裕興記",
    category: "麵食",
    area: "待確認",
    businessHours: "待補資料",
    notes: "分店與地址待確認。"
  },
  {
    id: "restaurant-hongxiangli-jingan",
    name: "鴻祥里（靜安店）",
    category: "新上海菜",
    area: "靜安",
    businessHours: "待補資料",
    notes: "靜安店；實際門牌與營業時間待確認。"
  },
  {
    id: "restaurant-laojishi-main",
    name: "老吉士（總店）",
    category: "本幫菜",
    area: "衡復附近",
    businessHours: "待補資料",
    notes: "總店地址與訂位資訊待確認。"
  },
  {
    id: "restaurant-yongkang-coffee",
    name: "永康路咖啡街",
    category: "咖啡／街區",
    address: "上海市徐匯區永康路",
    area: "徐匯",
    businessHours: "各店不同",
    notes: "適合安排成自由活動，不指定單一店家。"
  },
  {
    id: "restaurant-gaolaojiu",
    name: "高老九火鍋",
    category: "火鍋",
    area: "待確認",
    businessHours: "待補資料",
    notes: "分店與地址待確認。"
  },
  {
    id: "restaurant-haidilao",
    name: "海底撈",
    category: "火鍋",
    area: "多分店",
    businessHours: "依分店",
    notes: "請用美團搜尋距離當日行程最近的分店。"
  },
  {
    id: "restaurant-amama",
    name: "阿嬤手作",
    category: "飲品",
    area: "待確認",
    businessHours: "待補資料",
    notes: "可作為美團外送備案；分店與地址待確認。"
  },
  {
    id: "restaurant-chagee",
    name: "霸王茶姬",
    category: "茶飲",
    area: "多分店",
    businessHours: "依分店",
    notes: "可依當日路線搜尋附近分店。"
  },
  {
    id: "restaurant-xiaoyang-fuzhou",
    name: "小楊生煎（福州路店）",
    category: "生煎",
    address: "上海市黃浦區福州路567號",
    area: "人民廣場／福州路",
    businessHours: "待確認",
    notes: "Day 4 早餐正式安排。"
  },
  {
    id: "restaurant-renheguan",
    name: "人和館",
    category: "本幫菜",
    area: "待確認",
    businessHours: "待補資料",
    notes: "高品質本幫菜備案；分店與地址待確認。"
  }
];

export const INITIAL_TRIP: TripDocument = {
  id: "shanghai-family-trip-2026",
  title: "上海 2026",
  subtitle: "五天四夜家庭旅行",
  startDate: "2026-09-14",
  endDate: "2026-09-18",
  days: [
    day(
      1,
      "2026-09-14",
      "抵達上海・沙美大樓・外灘・李百蟹",
      "抵達浦東後進市區，入住外灘，再用散步與夜景開啟上海行程。",
      [
        item("d1-flight", "09:55", "BR712 桃園起飛", {
          endTime: "12:05",
          category: "航班",
          transportMode: "flight",
          address: "桃園國際機場",
          notes: "去程航班；約 12:05 抵達浦東機場 T2。"
        }),
        item("d1-arrival", "12:05", "抵達浦東機場 T2", {
          category: "抵達",
          address: "上海浦東國際機場 T2",
        }),
        item("d1-mobile", "12:30", "中國移動辦 +86 門號", {
          category: "抵達手續",
          address: "上海浦東國際機場 T2",
          businessHours: "07:00–22:00",
          notes: "通關後辦理中國移動門號；T2 到達公眾區，找星巴克附近中國移動。"
        }),
        item("d1-maglev", "13:45", "浦東機場搭磁浮 → 龍陽路", {
          category: "交通",
          transportMode: "maglev",
          transportNote: "上海磁浮；浦東 → 龍陽路約 8 分鐘，營運約 07:02–21:42。",
          duration: "約 8 分鐘"
        }),
        item("d1-hotel-transfer", "14:20", "龍陽路 → 滴滴 → 飯店", {
          category: "交通",
          transportMode: "taxi",
          transportNote: "從龍陽路站搭滴滴前往飯店。",
          duration: "依路況"
        }),
        item("d1-checkin", "15:00", "入住｜上海外灘璞硯酒店", {
          category: "住宿",
          address: "上海市黃浦區北京東路398號",
          businessHours: "全天櫃台",
          notes: "先入住、整理行李。"
        }),
        item("d1-shamei", "15:15", "沙美大樓＋樓上咖啡", {
          endTime: "16:20",
          category: "景點／咖啡",
          address: "上海市黃浦區北京東路190號",
          duration: "約 65 分鐘"
        }),
        item("d1-nanjing", "16:30", "南京東路步行街", {
          endTime: "17:20",
          category: "散步",
          address: "上海市黃浦區南京東路",
          duration: "約 50 分鐘"
        }),
        item("d1-bund", "17:30", "外灘點燈／夜景", {
          endTime: "19:00",
          category: "景點",
          address: "上海市黃浦區中山東一路",
          duration: "約 90 分鐘"
        }),
        item("d1-libaixie", "19:20", "李百蟹", {
          endTime: "20:45",
          category: "晚餐",
          address: "上海市黃浦區中山東二路22號，外灘22號3樓",
          businessHours: "10:00–22:00",
          notes: "紅盔甲小龍蝦使用美團外送。",
          duration: "約 85 分鐘"
        }),
        item("d1-back-hotel", "21:00", "回飯店", {
          category: "住宿",
          address: "上海市黃浦區北京東路398號",
          transportMode: "taxi",
          transportNote: "滴滴或步行，依當時體力與路況。"
        })
      ],
      [
        segment("d1-t1", "桃園國際機場", "上海浦東國際機場 T2", "flight", "BR712", "約 2 小時 10 分鐘"),
        segment("d1-t2", "浦東機場 T2", "龍陽路站", "maglev", "上海磁浮", "約 8 分鐘"),
        segment("d1-t3", "龍陽路站", "上海外灘璞硯酒店", "taxi", "滴滴", "依路況")
      ]
    ),
    day(
      2,
      "2026-09-15",
      "飯店早餐・武康大樓・圓苑・City Walk・羊肉串・豫園夜景",
      "武康大樓後步行前往圓苑用餐，再接續衡復街區散步，下午留白休息，晚上吃羊肉串看豫園夜景。",
      [
        item("d2-breakfast", "08:00", "飯店早餐", {
          endTime: "09:00",
          category: "早餐",
          address: "上海市黃浦區北京東路398號",
          duration: "約 60 分鐘"
        }),
        item("d2-to-wukang", "09:00", "滴滴出發", {
          category: "交通",
          transportMode: "taxi",
          transportNote: "飯店 → 武康大樓。"
        }),
        item("d2-wukang", "09:30", "武康大樓", {
          endTime: "10:15",
          category: "景點",
          address: "上海市徐匯區淮海中路1850號",
          businessHours: "建築外觀全天可看",
          duration: "約 45 分鐘"
        }),
        item("d2-walk-yuanyuan", "10:15", "步行前往圓苑（興國路店）", {
          endTime: "10:35",
          category: "交通",
          transportMode: "walk",
          transportNote: "武康大樓 → 圓苑（興國路店），步行約 15–20 分鐘。",
          duration: "約 15–20 分鐘"
        }),
        item("d2-yuanyuan", "11:00", "圓苑（興國路店）", {
          endTime: "12:30",
          category: "午餐",
          address: "上海市徐匯區興國路201號（近泰安路）",
          phone: "+86-21-64339123",
          businessHours: "11:00–21:30",
          duration: "約 90 分鐘",
          sourceRestaurantId: "restaurant-yuanyuan-xingguo"
        }),
        item("d2-citywalk", "12:30", "衡復 City Walk", {
          endTime: "14:30",
          category: "散步",
          address: "上海市徐匯區衡復風貌區",
          duration: "約 2 小時",
          notes: "午餐後路線：圓苑（興國路店）→ 巨鹿路 → 富民路 → 長樂路 → 東湖路 → 延慶路；中間安排咖啡、休息。"
        }),
        item("d2-free", "14:30", "自由活動／休息", {
          endTime: "16:45",
          category: "留白",
          duration: "約 2 小時 15 分鐘",
          flexible: true,
          notes: "不要安排新天地。"
        }),
        item("d2-yangrou", "17:30", "很久以前羊肉串｜陝西南路店", {
          endTime: "19:00",
          category: "晚餐",
          address: "上海市黃浦區陝西南路141號3樓",
          businessHours: "11:00–14:00、16:30–次日 01:00",
          duration: "約 90 分鐘"
        }),
        item("d2-to-yuyuan", "19:00", "滴滴前往豫園", {
          category: "交通",
          transportMode: "taxi",
          transportNote: "陝西南路店 → 豫園商城。"
        }),
        item("d2-yuyuan", "19:30", "豫園商城・九曲橋・湖心亭夜景", {
          endTime: "21:00",
          category: "夜景",
          address: "上海市黃浦區方浜中路265–269號一帶",
          businessHours: "商城約 08:30–21:00",
          duration: "約 90 分鐘",
          notes: "不進豫園園林本體。"
        }),
        item("d2-back-hotel", "21:00", "滴滴回飯店", {
          category: "交通",
          transportMode: "taxi",
          address: "上海市黃浦區北京東路398號"
        })
      ],
      [
        segment("d2-t1", "上海外灘璞硯酒店", "武康大樓", "taxi", "滴滴", "依路況"),
        segment("d2-t2", "武康大樓", "圓苑（興國路店）", "walk", "步行前往圓苑", "約 15–20 分鐘"),
        segment("d2-t3", "圓苑（興國路店）", "衡復 City Walk", "walk", "步行銜接街區", "依體力"),
        segment("d2-t4", "陝西南路店", "豫園商城", "taxi", "滴滴", "依路況"),
        segment("d2-t5", "豫園商城", "上海外灘璞硯酒店", "taxi", "滴滴", "依路況")
      ]
    ),
    day(
      3,
      "2026-09-16",
      "朱家角＋游沐日記",
      "以地鐵與 17 號線前往朱家角古鎮，下午回市區泡湯、汗蒸與休息。",
      [
        item("d3-hotel-leave", "08:30", "飯店出發", {
          category: "交通",
          address: "上海市黃浦區北京東路398號",
          transportMode: "walk",
          transportNote: "前往南京東路站。"
        }),
        item("d3-nanjing-station", "08:45", "南京東路站", {
          category: "交通",
          transportMode: "walk",
          notes: "飯店 → 南京東路站。"
        }),
        item("d3-metro-2", "08:40", "地鐵 2 號線 → 虹橋火車站", {
          category: "交通",
          transportMode: "metro",
          transportNote: "南京東路站搭地鐵 2 號線。"
        }),
        item("d3-metro-17", "09:30", "轉 17 號線 → 朱家角站", {
          category: "交通",
          transportMode: "metro",
          transportNote: "虹橋火車站轉乘 17 號線。"
        }),
        item("d3-zhujiajiao", "10:30", "朱家角古鎮", {
          endTime: "14:30",
          category: "景點",
          address: "上海市青浦區朱家角鎮",
          businessHours: "古鎮街區全天可逛",
          duration: "約 4 小時",
          notes: "放生橋、北大街、水岸老街、路邊小吃、搭船。"
        }),
        item("d3-leave-zhujiajiao", "14:30", "離開朱家角", {
          category: "交通",
          transportMode: "walk",
          transportNote: "前往朱家角站。"
        }),
        item("d3-back-hongqiao", "14:45", "朱家角站 → 虹橋火車站", {
          category: "交通",
          transportMode: "metro",
          transportNote: "17 號線。"
        }),
        item("d3-to-youmu", "15:20", "虹橋火車站 → 滴滴 → 游沐日記", {
          category: "交通",
          transportMode: "taxi",
          transportNote: "從虹橋火車站搭滴滴前往游沐日記。"
        }),
        item("d3-youmu", "16:00", "游沐日記", {
          endTime: "21:00",
          category: "泡湯／晚餐",
          address: "上海市普陀區真北路2219號",
          businessHours: "24 小時營業",
          duration: "約 5 小時",
          notes: "泡湯、汗蒸、休息、水果、飲料、晚餐。"
        }),
        item("d3-back-hotel", "21:00", "滴滴回飯店", {
          category: "交通",
          transportMode: "taxi",
          address: "上海市黃浦區北京東路398號"
        })
      ],
      [
        segment("d3-t1", "飯店", "南京東路站", "walk", "步行", "約 10 分鐘"),
        segment("d3-t2", "南京東路站", "虹橋火車站", "metro", "地鐵 2 號線", "依班距"),
        segment("d3-t3", "虹橋火車站", "朱家角站", "metro", "轉乘 17 號線", "依班距"),
        segment("d3-t4", "朱家角站", "朱家角古鎮", "taxi", "滴滴", "依路況"),
        segment("d3-t5", "朱家角站", "虹橋火車站", "metro", "17 號線", "依班距"),
        segment("d3-t6", "虹橋火車站", "游沐日記", "taxi", "滴滴", "依路況"),
        segment("d3-t7", "游沐日記", "飯店", "taxi", "滴滴", "依路況")
      ]
    ),
    day(
      4,
      "2026-09-17",
      "小楊生煎・MANNER・北外灘・敘敦煌",
      "早上吃生煎、喝咖啡看浦東天際線，下午在北外灘銜接敘宴與妝髮。",
      [
        item("d4-hotel-leave", "09:00", "飯店出發", {
          category: "交通",
          address: "上海市黃浦區北京東路398號",
          transportMode: "walk"
        }),
        item("d4-xiaoyang", "09:15", "小楊生煎｜福州路店", {
          endTime: "09:55",
          category: "早餐",
          address: "上海市黃浦區福州路567號1樓",
          businessHours: "06:30–21:00",
          sourceRestaurantId: "restaurant-xiaoyang-fuzhou",
          duration: "約 40 分鐘"
        }),
        item("d4-to-manner", "10:00", "滴滴前往 MANNER", {
          category: "交通",
          transportMode: "taxi",
          transportNote: "福州路店 → MANNER Coffee 國客濱江店。"
        }),
        item("d4-manner", "10:30", "MANNER Coffee 國客濱江店", {
          endTime: "11:45",
          category: "咖啡／景色",
          address: "北外灘國客中心碼頭海事塔區域",
          businessHours: "平日 07:30–22:00；週末約 08:00–22:00",
          duration: "約 75 分鐘",
          notes: "喝咖啡、看東方明珠、拍浦東天際線。"
        }),
        item("d4-north-bund", "11:45", "北外灘濱江", {
          endTime: "13:45",
          category: "散步",
          address: "上海市虹口區北外灘濱江",
          duration: "約 2 小時"
        }),
        item("d4-raffles", "13:45", "北外灘來福士", {
          endTime: "15:00",
          category: "商場／休息",
          address: "上海市虹口區東大名路999號",
          duration: "約 75 分鐘"
        }),
        item("d4-to-xuyan", "15:00", "前往敘宴", {
          category: "交通",
          transportMode: "walk",
          transportNote: "前往北外灘來福士內敘宴／敘敦煌。"
        }),
        item("d4-checkin", "15:45", "敘宴報到", {
          category: "活動",
          address: "上海市虹口區東大名路999號，北外灘來福士 3 樓"
        }),
        item("d4-makeup", "16:00", "妝髮準備", {
          category: "活動",
          address: "北外灘來福士 3 樓，水星中庭 01-02"
        }),
        item("d4-xudunhuang", "18:00", "敘宴・敘敦煌", {
          category: "晚宴",
          address: "上海市虹口區東大名路999號，北外灘來福士3樓，水星中庭01-02",
          notes: "實際開始時間依敘宴安排。"
        })
      ],
      [
        segment("d4-t1", "飯店", "小楊生煎福州路店", "walk", "步行", "依體力"),
        segment("d4-t2", "福州路店", "MANNER 國客濱江店", "taxi", "滴滴", "依路況"),
        segment("d4-t3", "MANNER", "北外灘濱江", "walk", "步行", "約 5 分鐘"),
        segment("d4-t4", "北外灘來福士", "敘宴・敘敦煌", "walk", "商場內步行", "約 5 分鐘")
      ]
    ),
    day(
      5,
      "2026-09-18",
      "本幫菜・磁浮・浦東機場",
      "上午從容退房寄放行李，中午吃本幫菜，下午取行李後搭磁浮前往浦東機場。",
      [
        item("d5-breakfast", "08:30", "早餐＋整理行李", {
          endTime: "09:30",
          category: "早餐",
          address: "上海市黃浦區北京東路398號",
          duration: "約 60 分鐘"
        }),
        item("d5-checkout", "10:00", "退房／行李寄放飯店", {
          category: "住宿",
          address: "上海市黃浦區北京東路398號",
          notes: "退房後將行李寄放飯店。"
        }),
        item("d5-nearby", "10:00", "附近輕鬆活動", {
          endTime: "11:15",
          category: "留白",
          flexible: true,
          duration: "約 75 分鐘",
          notes: "依體力在飯店附近簡單散步或休息。"
        }),
        item("d5-laoruifu", "11:20", "老瑞福上海菜｜人民廣場店", {
          endTime: "13:10",
          category: "午餐",
          address: "上海市黃浦區鳳陽路238號",
          businessHours: "10:30–14:00、16:30–21:00",
          sourceRestaurantId: "restaurant-laoruifu-renmin",
          duration: "約 110 分鐘",
          notes: "本次正式安排的本幫菜。"
        }),
        item("d5-near-hotel", "13:10", "回飯店附近", {
          category: "留白",
          flexible: true,
          address: "上海市黃浦區北京東路398號"
        }),
        item("d5-pick-luggage", "14:30", "回飯店取行李", {
          category: "住宿／行李",
          address: "上海市黃浦區北京東路398號"
        }),
        item("d5-to-longyang", "15:00", "滴滴 → 龍陽路磁浮站", {
          category: "交通",
          transportMode: "taxi",
          transportNote: "飯店 → 龍陽路磁浮站。"
        }),
        item("d5-maglev", "15:30", "龍陽路 → 上海磁浮 → 浦東國際機場", {
          category: "交通",
          transportMode: "maglev",
          transportNote: "搭上海磁浮前往浦東機場；龍陽路 → 浦東約 8 分鐘，營運約 06:45–21:40。"
        }),
        item("d5-airport", "16:00", "抵達浦東機場", {
          category: "機場",
          address: "上海浦東國際機場",
          notes: "預留報到、安檢與退稅／採買時間。"
        }),
        item("d5-flight-home", "20:05", "回程航班起飛", {
          category: "航班",
          transportMode: "flight",
          address: "上海浦東國際機場",
          notes: "9/18 20:05 上海浦東出發。"
        })
      ],
      [
        segment("d5-t1", "飯店", "人民廣場店", "walk", "步行或短程接駁", "依體力"),
        segment("d5-t2", "人民廣場", "飯店", "taxi", "回飯店取行李", "依路況"),
        segment("d5-t3", "飯店", "龍陽路磁浮站", "taxi", "滴滴", "依路況"),
        segment("d5-t4", "龍陽路磁浮站", "浦東國際機場", "maglev", "上海磁浮", "約 8 分鐘")
      ]
    )
  ],
  restaurants,
  tasks,
  info: {
    hotel: {
      name: "上海外灘璞硯酒店",
      address: "上海市黃浦區北京東路398號",
      phone: "+86-21-63522888"
    },
    flights: [
      {
        id: "flight-outbound",
        label: "去程",
        flightNumber: "BR712",
        date: "2026-09-14",
        time: "09:55",
        route: "桃園出發 → 上海浦東 T2"
      },
      {
        id: "flight-return",
        label: "回程",
        flightNumber: "BR721",
        date: "2026-09-18",
        time: "20:05",
        route: "上海浦東出發 → 桃園"
      }
    ],
    members: [],
    maglevStation: "龍陽路磁浮站",
    airport: "上海浦東國際機場"
  },
  versions: []
};
