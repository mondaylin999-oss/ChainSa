(function () {
  var translations = {
    "Sound volume": "အသံအတိုးအကျယ်",
    "Decrease sound volume": "အသံလျှော့ရန်",
    "Increase sound volume": "အသံတိုးရန်",
    "Environmental Overview": "ပတ်ဝန်းကျင် အခြေအနေ အကျဉ်းချုပ်",
    "What Changed?": "ဘာတွေ ပြောင်းလဲသွားသလဲ။",
    "Monthly and Calendar-quarter Patterns": "လစဉ်နှင့် ပြက္ခဒိန်သုံးလပတ် အခြေအနေများ",
    "Understanding the Measurement": "တိုင်းတာချက်ကို နားလည်ခြင်း",
    "Data Quality and Geographic Coverage": "အချက်အလက် အရည်အသွေးနှင့် နယ်မြေလွှမ်းခြုံမှု",
    "Scientific Methodology": "သိပ္ပံနည်းကျ တွက်ချက်ပုံ",
    "Limitations and Unavailable Conclusions": "ကန့်သတ်ချက်များနှင့် မကောက်ချက်ချနိုင်သည့်အရာများ",
    "What was observed, what changed, and how much evidence supports the description.": "လေ့လာတွေ့ရှိချက်၊ ပြောင်းလဲမှုနှင့် ထောက်ခံသည့် အချက်အလက်များ။",
    "Show calendar-quarter details": "ပြက္ခဒိန်သုံးလပတ် အသေးစိတ်ကြည့်ရန်",
    "What does this mean?": "ဒါက ဘာကိုဆိုလိုသလဲ။",
    "Show evidence and technical details": "အထောက်အထားနှင့် တွက်ချက်ပုံ အသေးစိတ်ကြည့်ရန်",
    "Actual observations": "အမှန်တကယ် ရရှိသော အချက်အလက်ကာလ",
    "Valid count": "အသုံးပြုနိုင်သည့် အချက်အလက်အရေအတွက်",
    "Descriptive change rate": "ဖော်ပြချက်အရ ပြောင်းလဲနှုန်း",
    "Absolute change": "ပမာဏ ပြောင်းလဲမှု",
    "Percentage change": "ရာခိုင်နှုန်း ပြောင်းလဲမှု",
    "Parameter / dataset": "တိုင်းတာချက် / အချက်အလက်အစု",
    "Expected observations": "မျှော်မှန်း အချက်အလက်အရေအတွက်",
    "Quality filtering": "အရည်အသွေး စိစစ်မှု",
    "Geometry": "နယ်နိမိတ်ပုံစံ",
    "Observed level and variability": "တွေ့ရှိသော တန်ဖိုးနှင့် အတက်အကျ",
    "Observed change": "တွေ့ရှိသော ပြောင်းလဲမှု",
    "Directional pattern": "ပြောင်းလဲမှု ဦးတည်ချက်",
    "Early versus late variability": "အစောပိုင်းနှင့် နောက်ပိုင်း အတက်အကျ နှိုင်းယှဉ်ချက်",
    "Calendar quarters group Jan–Mar, Apr–Jun, Jul–Sep, and Oct–Dec. They do not represent Myanmar’s wet and dry seasons.": "ပြက္ခဒိန်သုံးလပတ်များသည် ဇန်နဝါရီ–မတ်၊ ဧပြီ–ဇွန်၊ ဇူလိုင်–စက်တင်ဘာနှင့် အောက်တိုဘာ–ဒီဇင်ဘာ ဖြစ်သည်။ မြန်မာနိုင်ငံ၏ မိုးရာသီနှင့် ခြောက်သွေ့ရာသီကို မဆိုလိုပါ။",
    "Recent Discoveries": "မကြာသေးမီက ရှာဖွေမှုများ",
    "Saved on this device. Clearing browser data removes this history. Download PDFs to keep a copy.": "ဤစက်ပေါ်တွင် သိမ်းထားသည်။ ဘရောက်ဇာအချက်အလက်များကို ရှင်းပါက မှတ်တမ်းများ ပျောက်ပါမည်။ မိတ္တူအဖြစ် PDF ဒေါင်းလုဒ်လုပ်ထားပါ။",
    "Play videos": "ဗီဒီယိုများ ဖွင့်ရန်",
    "Pause videos": "ဗီဒီယိုများ ခေတ္တရပ်ရန်",
    "Powered by NASA data": "NASA အချက်အလက်များကို အသုံးပြုထားသည်",
    "Map zoom controls": "မြေပုံ အနီးအဝေး ထိန်းချုပ်ရန်",
    "Zoom in": "ချဲ့ရန်",
    "Zoom out": "ချုံ့ရန်",
    "Reset map zoom": "မြေပုံ မြင်ကွင်းကို မူလအတိုင်း ပြန်ထားရန်",
    "Reset zoom": "မူလမြင်ကွင်းသို့ ပြန်ရန်",
    "Dark mode": "အမှောင်မုဒ်",
    "Light mode": "အလင်းမုဒ်",
    "Switch to dark mode": "အမှောင်မုဒ်သို့ ပြောင်းရန်",
    "Switch to light mode": "အလင်းမုဒ်သို့ ပြောင်းရန်",
    "Interface language": "ဘာသာစကားရွေးချယ်ရန်",
    "Settings": "ဆက်တင်များ",
    "Language": "ဘာသာစကား",
    "Display": "ပြသမှု",
    "English": "အင်္ဂလိပ်",
    "OBSERVED CHANGE": "တိုင်းတာထားသော ပြောင်းလဲမှု",
    "Significant Trends": "စာရင်းအင်းအရ ထင်ရှားသော လမ်းကြောင်းများ",
    "Explore changes over time and check whether the available observations support a statistically significant trend.": "အချိန်အလိုက် ပြောင်းလဲမှုကို လေ့လာပြီး ရရှိသော တိုင်းတာချက်များက စာရင်းအင်းအရ ထင်ရှားသော လမ်းကြောင်းကို ထောက်ခံခြင်းရှိမရှိ စစ်ပါ။",
    "No analysis selected": "လေ့လာမှု မရွေးရသေးပါ",
    "Choose a location, indicator and date range in Explore, then apply your selection. Open Detailed statistics & scientific notes to see the significance result.": "Explore တွင် တည်နေရာ၊ ညွှန်ကိန်းနှင့် ရက်စွဲကာလရွေးပြီး အသုံးပြုပါ။ ထင်ရှားမှုရလဒ်ကို ကြည့်ရန် အသေးစိတ် စာရင်းအင်းနှင့် သိပ္ပံဆိုင်ရာ မှတ်စုများကို ဖွင့်ပါ။",
    "Significance testing is currently available for NASA POWER air temperature when coverage and quality checks pass. Other indicators show descriptive trends.": "လွှမ်းခြုံမှုနှင့် အရည်အသွေး စစ်ဆေးချက်များ အောင်မြင်ပါက NASA POWER လေထုအပူချိန်အတွက် ထင်ရှားမှု စမ်းသပ်ချက် ရနိုင်သည်။ အခြားညွှန်ကိန်းများတွင် ဖော်ပြချက်ဆိုင်ရာ လမ်းကြောင်းကို ပြသည်။",
    "Explore trends →": "လမ်းကြောင်းများ လေ့လာရန် →",
    "Earth Trend Detective": "ကမ္ဘာမြေပြောင်းလဲမှု လေ့လာရေး",
    "Earth Trend Detective · Myanmar Earth Intelligence": "ကမ္ဘာမြေပြောင်းလဲမှု လေ့လာရေး · မြန်မာ့ ကမ္ဘာမြေ အချက်အလက်",
    "MYANMAR EARTH INTELLIGENCE": "မြန်မာ့ ကမ္ဘာမြေ အချက်အလက်",
    "Satellite intelligence for every township": "မြို့နယ်တိုင်းအတွက် ဂြိုဟ်တု အချက်အလက်",
    "Detect the Change.": "ပြောင်းလဲမှုကို ရှာဖွေပါ။",
    "Understand": "နားလည်ပါ",
    "the Trend.": "ပြောင်းလဲမှုလမ်းကြောင်းကို။",
    "Make Better": "ပိုမိုကောင်းမွန်သော",
    "Decisions.": "ဆုံးဖြတ်ချက်များ ချပါ။",
    "NASA Earth observation data for Myanmar, turned into clear trends and AI guidance you can act on.": "မြန်မာနိုင်ငံအတွက် နာဆာ ကမ္ဘာမြေလေ့လာရေး အချက်အလက်များကို နားလည်လွယ်သော ပြောင်းလဲမှုလမ်းကြောင်းများနှင့် လက်တွေ့အသုံးချနိုင်သည့် AI လမ်းညွှန်ချက်များအဖြစ် ဖော်ပြထားပါသည်။",
    "Soil Moisture": "မြေဆီလွှာ စိုထိုင်းဆ",
    "Vegetation": "အပင်ဖုံးလွှမ်းမှု",
    "Farmers": "လယ်သမားများ",
    "Urban planners": "မြို့ပြ စီမံကိန်းရေးဆွဲသူများ",
    "Disaster teams": "ဘေးအန္တရာယ် တုံ့ပြန်ရေးအဖွဲ့များ",
    "Sample": "နမူနာ",
    "Based on these trends, what should farmers in Yangon consider?": "ဤပြောင်းလဲမှုလမ်းကြောင်းများအရ ရန်ကုန်ရှိ လယ်သမားများ ဘာကို ထည့်သွင်းစဉ်းစားသင့်သနည်း။",
    "Consider drought-resistant crop varieties.": "မိုးခေါင်ဒဏ်ခံနိုင်သော သီးနှံမျိုးများကို စဉ်းစားပါ။",
    "Adjust planting schedule with updated seasonal rainfall forecasts.": "ရာသီအလိုက် မိုးရေချိန် ခန့်မှန်းချက်အသစ်များနှင့်အညီ စိုက်ပျိုးချိန်ကို ပြင်ဆင်ပါ။",
    "Monitor soil moisture and adopt efficient irrigation (e.g., drip irrigation).": "မြေဆီလွှာစိုထိုင်းဆကို စောင့်ကြည့်ပြီး ရေစက်ချစနစ်ကဲ့သို့ ထိရောက်သော ရေပေးစနစ်ကို အသုံးပြုပါ။",
    "Map of Myanmar colored by vegetation, with Yangon marked": "အပင်ဖုံးလွှမ်းမှု အရောင်ပြထားပြီး ရန်ကုန်ကို မှတ်သားထားသော မြန်မာနိုင်ငံမြေပုံ",
    "Design preview · illustrative figures, not live observations": "ဒီဇိုင်းနမူနာ · ပြသထားသော ကိန်းဂဏန်းများသည် ဥပမာများသာဖြစ်ပြီး တိုက်ရိုက်တိုင်းတာချက် မဟုတ်ပါ",
    "Explore Live Trends": "တိုက်ရိုက် လမ်းကြောင်းများကို လေ့လာရန်",
    "Ask AI Assistant": "AI လက်ထောက်ကို မေးရန်",
    "EXPLORE": "လေ့လာရန်",
    "Explore by Earth System": "ကမ္ဘာမြေစနစ်အလိုက် လေ့လာရန်",
    "Choose a category to detect trends, analyze changes, and get decision support.": "ပြောင်းလဲမှုများကို ရှာဖွေ၊ ခွဲခြမ်းစိတ်ဖြာပြီး ဆုံးဖြတ်ချက်အတွက် အထောက်အကူရရန် အမျိုးအစားတစ်ခုကို ရွေးပါ။",
    "Agriculture": "စိုက်ပျိုးရေး",
    "Crop health, rainfall, soil, temperature": "သီးနှံအခြေအနေ၊ မိုးရေချိန်၊ မြေဆီလွှာနှင့် အပူချိန်",
    "Infrastructure & Urban Change": "အခြေခံအဆောက်အအုံနှင့် မြို့ပြပြောင်းလဲမှု",
    "Land use, urban growth, construction": "မြေအသုံးချမှု၊ မြို့ပြတိုးချဲ့မှုနှင့် ဆောက်လုပ်ရေး",
    "Water": "ရေ",
    "Water resources, river, water supply": "ရေအရင်းအမြစ်၊ မြစ်နှင့် ရေပေးဝေမှု",
    "Energy & Electricity": "စွမ်းအင်နှင့် လျှပ်စစ်",
    "Solar potential, electricity access, demand": "နေရောင်ခြည်စွမ်းအင် အလားအလာ၊ လျှပ်စစ်ရရှိမှုနှင့် လိုအပ်ချက်",
    "Environmental Change": "ပတ်ဝန်းကျင် ပြောင်းလဲမှု",
    "Forest, biodiversity, land cover": "သစ်တော၊ ဇီဝမျိုးစုံမျိုးကွဲနှင့် မြေဖုံးလွှမ်းမှု",
    "Disaster Intelligence": "သဘာဝဘေး အချက်အလက်",
    "Flood, landslide, earthquake, wildfire": "ရေကြီးမှု၊ မြေပြိုမှု၊ ငလျင်နှင့် တောမီး",
    "EARTH SYSTEM ASSISTANT": "ကမ္ဘာမြေစနစ် လက်ထောက်",
    "AI Decision Support": "AI ဆုံးဖြတ်ချက် အထောက်အကူ",
    "Pick who you are. The assistant reads the same data and answers for your decision.": "သင်၏အခန်းကဏ္ဍကို ရွေးပါ။ လက်ထောက်သည် တူညီသော အချက်အလက်များကို အသုံးပြုပြီး ဆုံးဖြတ်ချက်အတွက် အဖြေပေးပါမည်။",
    "Recommended Actions": "အကြံပြု လုပ်ဆောင်ချက်များ",
    "HOW IT WORKS": "အသုံးပြုပုံ",
    "Pause animation": "လှုပ်ရှားမှုကို ခေတ္တရပ်ပါ",
    "Play animation": "လှုပ်ရှားမှုကို ပြန်ဖွင့်ပါ",
    "How to use the Explore page": "လေ့လာရေးစာမျက်နှာကို အသုံးပြုပုံ",
    "Explore in 3 easy steps": "လွယ်ကူသော အဆင့် ၃ ဆင့်ဖြင့် လေ့လာပါ",
    "Choose your system & data": "စနစ်နှင့် အချက်အလက်ကို ရွေးပါ",
    "Pick a category such as Agriculture or Water. Then choose your area, dataset and time period.": "စိုက်ပျိုးရေး သို့မဟုတ် ရေကဲ့သို့သော အမျိုးအစားတစ်ခုကို ရွေးပါ။ ထို့နောက် ဧရိယာ၊ အချက်အလက်အမျိုးအစားနှင့် အချိန်ကာလကို ရွေးပါ။",
    "Read the map & explore views": "မြေပုံနှင့် အချက်အလက် မြင်ကွင်းများကို လေ့လာပါ",
    "Zoom into your region or township, read the map, and explore the corresponding data in the observation chart.": "သင့်တိုင်းဒေသကြီး သို့မဟုတ် မြို့နယ်ကို ချဲ့ကြည့်ပြီး မြေပုံနှင့် သက်ဆိုင်ရာ အချက်အလက်ဇယားကို လေ့လာပါ။",
    "Check trends & ask for guidance": "လမ်းကြောင်းများကို စစ်ဆေးပြီး လမ်းညွှန်ချက် ရယူပါ",
    "Check how the selected indicator changes over time. Ask the AI assistant for key insights, guidance and recommended actions.": "ရွေးချယ်ထားသော ညွှန်ကိန်း၏ အချိန်နှင့်အမျှ ပြောင်းလဲမှုကို စစ်ဆေးပါ။ AI လက်ထောက်ထံမှ အဓိကသုံးသပ်ချက်များ၊ လမ်းညွှန်ချက်နှင့် အကြံပြု လုပ်ဆောင်ချက်များကို ရယူပါ။",
    "Choose an Earth system": "ကမ္ဘာမြေစနစ်တစ်ခုကို ရွေးပါ",
    "Pick a category in the left panel, such as Agriculture or Water.": "ဘယ်ဘက်အကန့်ရှိ စိုက်ပျိုးရေး သို့မဟုတ် ရေကဲ့သို့သော အမျိုးအစားတစ်ခုကို ရွေးပါ။",
    "Set township, dataset, time": "မြို့နယ်၊ အချက်အလက်အမျိုးအစားနှင့် ကာလကို သတ်မှတ်ပါ",
    "Use the three dropdowns: Township, Dataset (e.g. NDVI) and Time Period.": "မြို့နယ်၊ အချက်အလက်အမျိုးအစား (ဥပမာ NDVI) နှင့် အချိန်ကာလအတွက် ရွေးချယ်စရာများကို အသုံးပြုပါ။",
    "Read the map": "မြေပုံကို ဖတ်ရှုပါ",
    "Colors run from Low to High. Zoom, switch layers, or re-center on your township.": "အရောင်များသည် နည်းမှ များသို့ ပြသထားသည်။ ချဲ့ကြည့်ပါ၊ အလွှာပြောင်းပါ၊ သို့မဟုတ် သင့်မြို့နယ်ကို ဗဟိုပြုပါ။",
    "Switch the view": "မြင်ကွင်းကို ပြောင်းပါ",
    "Tabs show the same data as Trend Analysis, Comparison, Map View or Data Table.": "လမ်းကြောင်းခွဲခြမ်းစိတ်ဖြာမှု၊ နှိုင်းယှဉ်မှု၊ မြေပုံ သို့မဟုတ် အချက်အလက်ဇယားတွင် တူညီသော အချက်အလက်များကို ကြည့်နိုင်သည်။",
    "Check the trend": "ပြောင်းလဲမှုလမ်းကြောင်းကို စစ်ဆေးပါ",
    "See the annual change, whether it is significant, plus temperature, rainfall and soil moisture.": "နှစ်အလိုက် ပြောင်းလဲမှု၊ ၎င်း၏ အရေးပါမှု၊ အပူချိန်၊ မိုးရေချိန်နှင့် မြေဆီလွှာစိုထိုင်းဆတို့ကို ကြည့်ပါ။",
    "Ask for guidance": "လမ်းညွှန်ချက် ရယူပါ",
    "AI Decision Support gives key insights and recommended actions. Open the detailed recommendation for more.": "AI ဆုံးဖြတ်ချက်အထောက်အကူက အဓိက သုံးသပ်ချက်များနှင့် အကြံပြုလုပ်ဆောင်ချက်များကို ပေးပါသည်။ အသေးစိတ်အတွက် အကြံပြုချက်ကို ဖွင့်ပါ။",
    "Recent Discoveries": "မကြာသေးမီက တွေ့ရှိချက်များ",
    "(Illustrative examples)": "(ဥပမာများ)",
    "Vegetation is declining in Yangon": "ရန်ကုန်တွင် အပင်ဖုံးလွှမ်းမှု လျော့ကျနေသည်",
    "Significant (p < 0.05)": "စာရင်းအင်းအရ အရေးပါသည် (p < 0.05)",
    "Drier and hotter: drought stress may rise": "ပိုမိုခြောက်သွေ့ ပူပြင်းလာပြီး မိုးခေါင်မှု ဖိအား မြင့်တက်နိုင်သည်",
    "Soil moisture is below the last decade": "မြေဆီလွှာ စိုထိုင်းဆသည် ယခင်ဆယ်စုနှစ်ထက် နည်းနေသည်",
    "View History": "မှတ်တမ်းကို ကြည့်ရန်",
    "Jump to a region": "ဒေသတစ်ခုသို့ သွားရန်",
    "Switch region and open its trends in Explore.": "ဒေသကို ပြောင်းပြီး လေ့လာရေးတွင် ၎င်း၏ ပြောင်းလဲမှုများကို ဖွင့်ပါ။",
    "Explore Other Regions": "အခြားဒေသများကို လေ့လာရန်",
    "Powered by NASA Earth Observation Data": "နာဆာ ကမ္ဘာမြေလေ့လာရေး အချက်အလက်များဖြင့် ပံ့ပိုးထားသည်",
    "Yangon": "ရန်ကုန်",
    "Mandalay": "မန္တလေး",
    "Ayeyarwady": "ဧရာဝတီ",
    "Sagaing": "စစ်ကိုင်း",
    "Bago": "ပဲခူး",
    "Magway": "မကွေး",
    "Shan": "ရှမ်း",
    "Rakhine": "ရခိုင်",
    "Nay Pyi Taw": "နေပြည်တော်",
    "Explore Myanmar": "မြန်မာနိုင်ငံကို လေ့လာရန်",
    "Explore": "လေ့လာရန်",
    "Map & data workspace": "မြေပုံနှင့် အချက်အလက် လုပ်ငန်းခွင်",
    "Choose a topic, then view a connected observation series and its source details.": "အကြောင်းအရာတစ်ခုကို ရွေးပြီး ဆက်စပ်တိုင်းတာမှုများနှင့် ၎င်းတို့၏ ရင်းမြစ်အသေးစိတ်ကို ကြည့်ပါ။",
    "Explore by topic": "အကြောင်းအရာအလိုက် လေ့လာရန်",
    "Explore by topic indicators": "အကြောင်းအရာညွှန်းကိန်းများအလိုက် လေ့လာရန်",
    "Select an area on the map": "မြေပုံပေါ်ရှိ ဧရိယာတစ်ခုကို ရွေးပါ",
    "Select Township": "မြို့နယ်ကို ရွေးပါ",
    "All townships in this region": "ဤဒေသရှိ မြို့နယ်အားလုံး",
    "Regional reference point": "ဒေသကိုယ်စားပြု အမှတ်",
    "(not a township)": "(မြို့နယ် မဟုတ်ပါ)",
    "Search a state or region": "ပြည်နယ် သို့မဟုတ် တိုင်းဒေသကြီးကို ရှာရန်",
    "Select data": "အချက်အလက်ကို ရွေးပါ",
    "Date range": "ရက်စွဲကာလ",
    "Apply dates": "ရက်စွဲများ အသုံးပြုရန်",
    "Observation series": "တိုင်းတာမှု အစဉ်",
    "Detailed info": "အသေးစိတ် အချက်အလက်",
    "Sources & context": "ရင်းမြစ်နှင့် နောက်ခံအချက်အလက်",
    "Coverage note": "လွှမ်းခြုံမှု မှတ်ချက်",
    "Back": "နောက်သို့",
    "Back to Home": "ပင်မစာမျက်နှာသို့ ပြန်ရန်",
    "All regions": "တိုင်းဒေသကြီးအားလုံး",
    "To region": "ဒေသသို့",
    "Connected": "ချိတ်ဆက်ထားသည်",
    "Not connected": "မချိတ်ဆက်ရသေးပါ",
    "Data source available": "အချက်အလက် ရင်းမြစ် ရရှိနိုင်သည်",
    "No data available": "အချက်အလက် မရရှိနိုင်ပါ",
    "Observations loaded": "တိုင်းတာချက်များ ရယူပြီးပါပြီ",
    "AI chat": "AI စကားပြော",
    "Close chat": "စကားပြောခန်း ပိတ်ရန်",
    "Home": "ပင်မစာမျက်နှာ",
    "Explore Map": "မြေပုံကို လေ့လာရန်"
    ,"Earth Trend Detective — Home": "ကမ္ဘာမြေပြောင်းလဲမှု လေ့လာရေး — ပင်မစာမျက်နှာ"
    ,"Build your view": "မြင်ကွင်းကို ပြင်ဆင်ပါ"
    ,"Data workspace": "အချက်အလက် လုပ်ငန်းခွင်"
    ,"Active area:": "လက်ရှိ ဧရိယာ -"
    ,"Township": "မြို့နယ်"
    ,"Observations use a representative point, not an area average.": "တိုင်းတာချက်များသည် ကိုယ်စားပြုအမှတ်ကို အသုံးပြုထားပြီး ဧရိယာတစ်ခုလုံး၏ ပျမ်းမျှ မဟုတ်ပါ။"
    ,"Select a mapped state or region to set the regional reference point. Select a region to reveal its township boundaries.": "ဒေသကိုယ်စားပြု အမှတ်သတ်မှတ်ရန် မြေပုံပေါ်ရှိ ပြည်နယ် သို့မဟုတ် တိုင်းဒေသကြီးကို ရွေးပါ။ မြို့နယ်နယ်နိမိတ်များကို ကြည့်ရန် ဒေသကို ရွေးပါ။"
    ,"Township boundaries support selection. NASA POWER uses the selected township or regional representative point.": "မြို့နယ်နယ်နိမိတ်များက ရွေးချယ်ရာတွင် အထောက်အကူပြုသည်။ NASA POWER သည် ရွေးထားသော မြို့နယ် သို့မဟုတ် ဒေသကိုယ်စားပြုအမှတ်ကို အသုံးပြုသည်။"
    ,"Township map coverage: available · Measurements: selected representative point": "မြို့နယ်မြေပုံ လွှမ်းခြုံမှု - ရရှိနိုင်သည် · တိုင်းတာချက်များ - ရွေးထားသော ကိုယ်စားပြုအမှတ်"
    ,"Selecting a township reloads NASA POWER at a point inside its boundary. Nearby townships may share the same NASA grid cell.": "မြို့နယ်တစ်ခုကို ရွေးလျှင် ၎င်းနယ်နိမိတ်အတွင်းရှိ အမှတ်တစ်ခုအတွက် NASA POWER အချက်အလက်ကို ပြန်ရယူမည်။ အနီးရှိ မြို့နယ်များသည် NASA ဂရစ်ဆဲလ်တစ်ခုတည်းကို မျှဝေနိုင်သည်။"
    ,"15 bundled regional reference locations; observations are point samples.": "ထည့်သွင်းထားသော ဒေသကိုယ်စားပြုနေရာ ၁၅ ခုရှိသည်။ တိုင်းတာချက်များသည် အမှတ်အခြေပြု နမူနာများဖြစ်သည်။"
    ,"No datasets are listed for this topic.": "ဤအကြောင်းအရာအတွက် အချက်အလက်အမျိုးအစား မရှိပါ။"
    ,"Published archive:": "ထုတ်ဝေထားသော မှတ်တမ်း -"
    ,"Selecting this dataset opens a suitable historical range.": "ဤအချက်အလက်အမျိုးအစားကို ရွေးလျှင် သင့်လျော်သော သမိုင်းမှတ်တမ်းကာလကို ဖွင့်မည်။"
    ,"Apply your dates to update the graph. Recent days may not have published observations yet.": "ဇယားကို အသစ်ပြရန် ရက်စွဲများကို အသုံးပြုပါ။ မကြာသေးမီရက်များအတွက် တိုင်းတာချက်များ မထုတ်ပြန်ရသေးနိုင်ပါ။"
    ,"NASA FIRMS supports up to 10 recent days ending today.": "NASA FIRMS သည် ယနေ့အထိ နောက်ဆုံး ၁၀ ရက်အတွက် အချက်အလက်ကို ပံ့ပိုးသည်။"
    ,"Source and coverage details will appear with the observations.": "တိုင်းတာချက်များနှင့်အတူ ရင်းမြစ်နှင့် လွှမ်းခြုံမှု အသေးစိတ်များ ပေါ်လာမည်။"
    ,"Select a connected dataset and regional reference point to see source metadata, observation period and limitations.": "ရင်းမြစ်အချက်အလက်၊ တိုင်းတာကာလနှင့် ကန့်သတ်ချက်များကို ကြည့်ရန် ချိတ်ဆက်ထားသော အချက်အလက်အမျိုးအစားနှင့် ဒေသကိုယ်စားပြုအမှတ်ကို ရွေးပါ။"
    ,"No dataset is catalogued for this indicator, so no observations can be shown.": "ဤညွှန်းကိန်းအတွက် အချက်အလက်အမျိုးအစား မှတ်တမ်းမရှိသဖြင့် တိုင်းတာချက်များကို မပြနိုင်ပါ။"
    ,"Plain-language reading": "နားလည်လွယ်သော ရှင်းလင်းချက်"
    ,"Limitations": "ကန့်သတ်ချက်များ"
    ,"What it measures": "တိုင်းတာသည့်အရာ"
    ,"Area": "ဧရိယာ"
    ,"Units & source": "ယူနစ်နှင့် ရင်းမြစ်"
    ,"Back to observation details": "တိုင်းတာချက် အသေးစိတ်သို့ ပြန်ရန်"
    ,"Select an area on the map, then a connected dataset and date range, to view observations.": "တိုင်းတာချက်များကို ကြည့်ရန် မြေပုံပေါ်ရှိ ဧရိယာတစ်ခု၊ ချိတ်ဆက်ထားသော အချက်အလက်အမျိုးအစားနှင့် ရက်စွဲကာလကို ရွေးပါ။"
    ,"Retrieving observations from the configured data service…": "သတ်မှတ်ထားသော အချက်အလက်ဝန်ဆောင်မှုမှ တိုင်းတာချက်များ ရယူနေသည်…"
    ,"No observation data is available for this selection. The home preview contains illustrative figures, not measured data.": "ဤရွေးချယ်မှုအတွက် တိုင်းတာချက် မရရှိပါ။ ပင်မစာမျက်နှာရှိ ကိန်းဂဏန်းများသည် ဥပမာများသာဖြစ်ပြီး တိုင်းတာထားသော အချက်အလက် မဟုတ်ပါ။"
    ,"Could not retrieve observations.": "တိုင်းတာချက်များကို ရယူ၍ မရပါ။"
    ,"Try again": "ထပ်ကြိုးစားရန်"
    ,"Missing values are left blank, not treated as zero.": "ပျောက်ဆုံးနေသော တန်ဖိုးများကို သုညဟု မယူဆဘဲ ဗလာအဖြစ် ချန်ထားသည်။"
    ,"No observations are available for this selection and period.": "ဤရွေးချယ်မှုနှင့် ကာလအတွက် တိုင်းတာချက် မရရှိပါ။"
    ,"NASA returned no valid observations for this period. Missing values are not plotted as zero.": "ဤကာလအတွက် မှန်ကန်သော NASA တိုင်းတာချက် မရရှိပါ။ ပျောက်ဆုံးတန်ဖိုးများကို သုညအဖြစ် ဂရပ်တွင် မပြပါ။"
    ,"Select a location": "တည်နေရာကို ရွေးပါ"
    ,"finish setup": "စနစ်တပ်ဆင်ရန်"
    ,"access needed": "ဝင်ရောက်ခွင့် လိုအပ်သည်"
    ,"no data yet": "အချက်အလက် မရှိသေးပါ"
    ,"Annual change": "နှစ်စဉ် ပြောင်းလဲမှု"
    ,"Comparison": "နှိုင်းယှဉ်မှု"
    ,"Map View": "မြေပုံမြင်ကွင်း"
    ,"Data Table": "အချက်အလက်ဇယား"
    ,"Trend Analysis": "ပြောင်းလဲမှု လမ်းကြောင်း ခွဲခြမ်းစိတ်ဖြာမှု"
    ,"Low": "နည်း"
    ,"High": "များ"
    ,"to": "မှ"
    ,"Rainfall": "မိုးရေချိန်"
    ,"Temperature": "အပူချိန်"
    ,"Humidity": "စိုထိုင်းဆ"
    ,"Solar radiation": "နေရောင်ခြည် ရောင်ခြည်"
    ,"Loading": "ဖွင့်နေသည်"
    ,"Loading…": "ဖွင့်နေသည်…"
    ,"Infrastructure and Urban Change": "အခြေခံအဆောက်အအုံနှင့် မြို့ပြပြောင်းလဲမှု"
    ,"Energy and electricity": "စွမ်းအင်နှင့် လျှပ်စစ်"
    ,"Air Temperature": "လေထုအပူချိန်"
    ,"Vegetation Greenness": "အပင်စိမ်းလန်းမှု"
    ,"Vegetation indices": "အပင်ဖုံးလွှမ်းမှု ညွှန်းကိန်းများ"
    ,"Vegetation index": "အပင်ဖုံးလွှမ်းမှု ညွှန်းကိန်း"
    ,"Evapotranspiration": "ရေငွေ့ပျံခြင်းနှင့် အပင်မှ ရေငွေ့ထုတ်လွှတ်မှု"
    ,"Extreme Rainfall Frequency": "မိုးသည်းထန်စွာ ရွာသွန်းသည့် အကြိမ်ရေ"
    ,"Flood Extent": "ရေလွှမ်းမိုးသည့် ဧရိယာ"
    ,"Drought Indicators": "မိုးခေါင်မှု ညွှန်းကိန်းများ"
    ,"Hot-day Frequency": "အပူပြင်းသော ရက်အရေအတွက်"
    ,"Active Fire / Hotspots": "လက်ရှိ မီးလောင်မှု / မီးစက်များ"
    ,"Burned Area": "မီးလောင်ပြီး ဧရိယာ"
    ,"Tree Cover": "သစ်ပင်ဖုံးလွှမ်းမှု"
    ,"Land Cover": "မြေဖုံးလွှမ်းမှု"
    ,"Land-surface temperature": "မြေမျက်နှာပြင် အပူချိန်"
    ,"Land-cover change": "မြေဖုံးလွှမ်းမှု ပြောင်းလဲခြင်း"
    ,"Aerosol optical depth": "လေထုမှုန် အလင်းစုပ်ယူမှု အနက်"
    ,"Urban vegetation": "မြို့ပြအတွင်း အပင်ဖုံးလွှမ်းမှု"
    ,"Urban surface temperature": "မြို့ပြ မြေမျက်နှာပြင် အပူချိန်"
    ,"River discharge / flow": "မြစ်ရေ စီးဆင်းမှု"
    ,"Wind speed": "လေတိုက်နှုန်း"
    ,"Nighttime lights": "ညအချိန် မီးရောင်များ"
    ,"Nighttime Brightness": "ညအချိန် အလင်းရောင် ပြင်းအား"
    ,"Lit Area": "အလင်းရောင်ရှိသော ဧရိယာ"
    ,"Precipitation": "မိုးရေချိန်"
    ,"Search": "ရှာဖွေရန်"
    ,"Select an area": "ဧရိယာကို ရွေးပါ"
    ,"Observations": "တိုင်းတာချက်များ"
    ,"Sources": "ရင်းမြစ်များ"
    ,"Status": "အခြေအနေ"
    ,"Published archive": "ထုတ်ဝေထားသော မှတ်တမ်း"
    ,"Dataset chart": "အချက်အလက် ဇယား"
    ,"Township map coverage": "မြို့နယ်မြေပုံ လွှမ်းခြုံမှု"
    ,"Measurements": "တိုင်းတာချက်များ"
    ,"Apply": "အသုံးပြုရန်"
    ,"Close": "ပိတ်ရန်"
    ,"Start date": "စတင်ရက်စွဲ"
    ,"End date": "ပြီးဆုံးရက်စွဲ"
    ,"State": "ပြည်နယ်"
    ,"Region": "တိုင်းဒေသကြီး"
    ,"Union Territory": "ပြည်ထောင်စုနယ်မြေ"
    ,"regional reference point": "ဒေသကိုယ်စားပြု အမှတ်"
    ,"Chin": "ချင်း"
    ,"Kachin": "ကချင်"
    ,"Kayah": "ကယား"
    ,"Kayin": "ကရင်"
    ,"Mon": "မွန်"
    ,"Tanintharyi": "တနင်္သာရီ"
    ,"Naypyidaw": "နေပြည်တော်"
    ,"Corrected precipitation (mm/day)": "ပြင်ဆင်တွက်ချက်ထားသော မိုးရေချိန် (မီလီမီတာ/ရက်)"
    ,"Corrected precipitation": "ပြင်ဆင်တွက်ချက်ထားသော မိုးရေချိန်"
    ,"Near-surface air temperature (°C)": "မြေပြင်အနီး လေထုအပူချိန် (°C)"
    ,"Near-surface air temperature": "မြေပြင်အနီး လေထုအပူချိန်"
    ,"Root-zone soil wetness (fraction (0–1))": "အမြစ်ဇုန် မြေဆီလွှာစိုထိုင်းဆ (အချိုး 0–1)"
    ,"Root-zone soil wetness": "အမြစ်ဇုန် မြေဆီလွှာစိုထိုင်းဆ"
    ,"Choose a dataset": "အချက်အလက်အမျိုးအစားကို ရွေးပါ"
    ,"Mon State": "မွန်ပြည်နယ်"
    ,"Mon Region": "မွန်တိုင်းဒေသကြီး"
    ,"1989–today": "၁၉၈၉ ခုနှစ်မှ ယနေ့အထိ"
  };
  var reverse = Object.create(null);
  Object.keys(translations).forEach(function (english) {
    if (!reverse[translations[english]]) reverse[translations[english]] = english;
  });
  var englishKeys = Object.keys(translations).sort(function (a, b) { return b.length - a.length; });
  var myanmarKeys = Object.keys(reverse).sort(function (a, b) { return b.length - a.length; });
  var current = "en";

  function textFor(value) {
    var result = value;
    var source = current === "my" ? englishKeys : myanmarKeys;
    var dictionary = current === "my" ? translations : reverse;
    if (dictionary[result]) return dictionary[result];
    source.forEach(function (key) {
      if (key.length > 3 && result.indexOf(key) !== -1) result = result.split(key).join(dictionary[key]);
    });
    return result;
  }

  function apply(locale) {
    current = locale === "my" ? "my" : "en";
    document.documentElement.lang = current;
    document.querySelectorAll("a").forEach(function (link) {
      var englishLabel = link.textContent.trim();
      if (englishLabel && !link.hasAttribute("data-earthlens-english-label")) link.setAttribute("data-earthlens-english-label", englishLabel);
    });
    var walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      if (node.parentElement && /^(SCRIPT|STYLE)$/.test(node.parentElement.tagName)) continue;
      var original = node.nodeValue || "";
      var trimmed = original.trim();
      if (!trimmed) continue;
      var translated = textFor(trimmed);
      if (translated !== trimmed) node.nodeValue = original.replace(trimmed, translated);
    }
    document.querySelectorAll("[placeholder], [aria-label], [title], [alt]").forEach(function (element) {
      ["placeholder", "aria-label", "title", "alt"].forEach(function (attribute) {
        var value = element.getAttribute(attribute);
        if (value) element.setAttribute(attribute, textFor(value));
      });
    });
    document.querySelectorAll("[data-earthlens-language]").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.getAttribute("data-earthlens-language") === current));
      button.classList.toggle("language-active", button.getAttribute("data-earthlens-language") === current);
    });
  }

  function save(locale, notifyParent) {
    current = locale === "my" ? "my" : "en";
    try { localStorage.setItem("earthlens-language", current); } catch (_) {}
    apply(current);
    window.dispatchEvent(new CustomEvent("earthlens-language-change", { detail: current }));
    if (notifyParent && window.parent !== window) {
      window.parent.postMessage({ type: "earthlens-home-language", lang: current }, window.location.origin);
    }
  }

  document.addEventListener("click", function (event) {
    if (!(event.target instanceof Element)) return;
    var trigger = event.target.closest("[data-settings-toggle]");
    if (trigger) {
      var panel = trigger.parentElement.querySelector("[data-settings-panel]");
      if (panel) {
        panel.hidden = !panel.hidden;
        trigger.setAttribute("aria-expanded", String(!panel.hidden));
      }
      return;
    }
    if (!event.target.closest("[data-settings-panel]")) {
      document.querySelectorAll("[data-settings-panel]").forEach(function (panel) {
        panel.hidden = true;
        var owner = panel.parentElement.querySelector("[data-settings-toggle]");
        if (owner) owner.setAttribute("aria-expanded", "false");
      });
    }
    var button = event.target.closest("[data-earthlens-language]");
    if (button) save(button.getAttribute("data-earthlens-language"), true);
  });
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    document.querySelectorAll("[data-settings-panel]").forEach(function (panel) {
      panel.hidden = true;
      var owner = panel.parentElement.querySelector("[data-settings-toggle]");
      if (owner) owner.setAttribute("aria-expanded", "false");
    });
  });
  window.addEventListener("earthlens-language-change", function (event) {
    if (event.detail === "en" || event.detail === "my") apply(event.detail);
  });
  window.addEventListener("storage", function (event) {
    if (event.key === "earthlens-language" || event.key === null) apply(readSaved());
  });
  function readSaved() {
    try { return localStorage.getItem("earthlens-language") === "my" ? "my" : "en"; } catch (_) { return "en"; }
  }
  apply(readSaved());
  var observer = new MutationObserver(function () { apply(current); });
  observer.observe(document.documentElement, { childList: true, characterData: true, subtree: true });
})();
