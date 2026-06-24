const fs = require('fs');
const cheerio = require('cheerio');

// Define tailored content for each page type
const contentData = {
    'destinations-hub': {
        cardsSectionTitle: "Must-Visit Destinations",
        cardsSectionSubtitle: "Explore the diverse landscapes of Georgia, from ancient cities to majestic mountains.",
        cards: [
            {
                img: "tbilisi-old-town-1024.webp", badge: "Capital", tag: "Culture & History",
                title: "Tbilisi", subtitle: "The vibrant capital where ancient history meets modern charm.",
                points: ["Narikala Fortress", "Abanotubani (Sulfur Baths)", "Rustaveli Avenue", "Vibrant Cafe Culture", "Old Town Balconies"]
            },
            {
                img: "kazbegi-hero-1024.webp", badge: "Mountains", tag: "Nature",
                title: "Kazbegi", subtitle: "Dramatic peaks and the iconic Gergeti Trinity Church.",
                points: ["Gergeti Trinity Church", "Dariali Gorge", "Gveleti Waterfall", "Rooms Hotel Views", "Hiking Trails"]
            },
            {
                img: "Batumi.webp", badge: "Coast", tag: "Relaxation",
                title: "Batumi", subtitle: "The pearl of the Black Sea with modern architecture.",
                points: ["Batumi Boulevard", "Ali and Nino Statue", "Botanical Garden", "Piazza Square", "Alphabetic Tower"]
            }
        ],
        featuresTitle: "Why Choose Our Destinations",
        features: [
            { icon: "fa-map", title: "Expert Navigation", text: "We know the hidden gems and the best routes to take." },
            { icon: "fa-camera", title: "Photo Opportunities", text: "Stops at the most picturesque viewpoints." },
            { icon: "fa-clock", title: "Paced for You", text: "Spend as much time as you want at each location." },
            { icon: "fa-car", title: "Comfortable Travel", text: "Luxury vehicles for long mountain drives." },
            { icon: "fa-utensils", title: "Local Cuisine", text: "We'll show you the best local restaurants in every city." },
            { icon: "fa-umbrella-beach", title: "Diverse Landscapes", text: "From snowy peaks to sunny beaches in one trip." }
        ]
    },
    'destinations-hub-ar': {
        cardsSectionTitle: "أهم الوجهات السياحية",
        cardsSectionSubtitle: "اكتشف تنوع الطبيعة في جورجيا، من المدن العريقة إلى الجبال الشاهقة.",
        cards: [
            {
                img: "tbilisi-old-town-1024.webp", badge: "العاصمة", tag: "تاريخ وثقافة",
                title: "تبليسي", subtitle: "العاصمة النابضة بالحياة حيث يلتقي التاريخ بالحداثة.",
                points: ["قلعة ناريكالا", "حمامات الكبريت", "شارع روستافيلي", "مقاهي المدينة القديمة", "تلفريك تبليسي"]
            },
            {
                img: "kazbegi-hero-1024.webp", badge: "الجبال", tag: "طبيعة",
                title: "كازبيجي", subtitle: "قمم جبلية درامية وطبيعة تخطف الأنفاس.",
                points: ["كنيسة جيرجيتي", "وادي داريالي", "شلالات جفيليتي", "إطلالات فندق رومز", "الأنشطة الجبلية"]
            },
            {
                img: "Batumi.webp", badge: "الساحل", tag: "استجمام",
                title: "باتومي", subtitle: "لؤلؤة البحر الأسود والهندسة المعمارية الحديثة.",
                points: ["ممشى باتومي", "تمثال علي ونينو", "الحديقة النباتية", "ساحة بيازا", "عروض الدلافين"]
            }
        ],
        featuresTitle: "لماذا تزور هذه الوجهات معنا",
        features: [
            { icon: "fa-map", title: "معرفة الخبراء", text: "نعرف الأماكن المخفية وأفضل الطرق المريحة للعوائل." },
            { icon: "fa-camera", title: "أجمل الإطلالات", text: "توقف في أفضل نقاط التصوير البانورامية." },
            { icon: "fa-clock", title: "مرونة تامة", text: "اقضِ الوقت الذي تريده في كل مكان بدون استعجال." },
            { icon: "fa-car", title: "سفر مريح", text: "سيارات فخمة ومريحة للرحلات الجبلية الطويلة." },
            { icon: "fa-utensils", title: "مطاعم مميزة", text: "نرشدك لأفضل المطاعم الحلال في كل مدينة." },
            { icon: "fa-umbrella-beach", title: "تنوع الطبيعة", text: "من القمم الثلجية إلى الشواطئ الدافئة." }
        ]
    },
    'family-travel-hub': {
        cardsSectionTitle: "Family Friendly Experiences",
        cardsSectionSubtitle: "Activities and itineraries perfectly paced for children and adults alike.",
        cards: [
            {
                img: "image-1024.avif", badge: "Theme Parks", tag: "Fun",
                title: "Mtatsminda Park", subtitle: "Amusement park overlooking Tbilisi with rides for all ages.",
                points: ["Giant Ferris Wheel", "Rollercoasters", "Kids Play Areas", "Panoramic Views", "Family Restaurants"]
            },
            {
                img: "martvili-opt.webp", badge: "Nature", tag: "Adventure",
                title: "Martvili Canyon", subtitle: "Gentle boat rides through emerald green waters.",
                points: ["Safe Boat Rides", "Stunning Waterfalls", "Easy Walking Trails", "Photo Spots", "Shaded Areas"]
            },
            {
                img: "Batumi.webp", badge: "Coast", tag: "Relaxation",
                title: "Batumi Dolphinarium", subtitle: "Exciting dolphin shows and beachside family fun.",
                points: ["Dolphin Shows", "Boulevard Biking", "Dancing Fountains", "Alphabet Tower", "Safe Beaches"]
            }
        ],
        featuresTitle: "Why Families Love Georgia Hills",
        features: [
            { icon: "fa-baby-carriage", title: "Child Seats", text: "Complimentary car seats for safety and comfort." },
            { icon: "fa-clock", title: "Flexible Pacing", text: "We adjust the schedule based on your kids' energy levels." },
            { icon: "fa-house", title: "Spacious Stays", text: "Recommendations for family suites and connected rooms." },
            { icon: "fa-kit-medical", title: "Safety First", text: "Careful drivers and strict adherence to safety protocols." },
            { icon: "fa-face-smile", title: "Kid-Friendly Stops", text: "Frequent stops for restrooms and snacks." },
            { icon: "fa-van-shuttle", title: "Spacious Vans", text: "Large Mercedes minivans with plenty of luggage space." }
        ]
    },
    'family-travel-hub-ar': {
        cardsSectionTitle: "تجارب تناسب العائلة",
        cardsSectionSubtitle: "أنشطة وبرامج مصممة خصيصاً لراحة الأطفال واستمتاع الكبار.",
        cards: [
            {
                img: "image-1024.avif", badge: "ملاهي", tag: "مرح",
                title: "حديقة متاتسميندا", subtitle: "مدينة ملاهي تطل على تبليسي تناسب جميع الأعمار.",
                points: ["عجلة فيريس العملاقة", "ألعاب ممتعة للأطفال", "أكشاك حلوى ومطاعم", "إطلالة بانورامية", "هواء نقي"]
            },
            {
                img: "martvili-opt.webp", badge: "طبيعة", tag: "مغامرة آمنة",
                title: "وادي مارتفيلي", subtitle: "جولات مريحة بالقوارب في المياه الخضراء الزمردية.",
                points: ["قوارب آمنة للعائلة", "شلالات خلابة", "مسارات مشي سهلة", "مناطق استراحة", "أجواء منعشة"]
            },
            {
                img: "Batumi.webp", badge: "ترفيه", tag: "الساحل",
                title: "عروض الدلافين", subtitle: "عروض الدلافين الممتعة في باتومي وأنشطة الشاطئ.",
                points: ["عروض الدلافين المبهرة", "ركوب الدراجات العائلية", "النوافير الراقصة", "الحديقة النباتية", "أجواء بحرية"]
            }
        ],
        featuresTitle: "لماذا تفضل العائلات الخليجية السفر معنا",
        features: [
            { icon: "fa-baby-carriage", title: "مقاعد أطفال", text: "نوفر مقاعد أمان مخصصة للأطفال مجاناً." },
            { icon: "fa-clock", title: "مرونة تامة", text: "نعدل الجدول حسب طاقة الأطفال وأوقات نومهم." },
            { icon: "fa-house", title: "سكن مناسب للعوائل", text: "نساعدك في اختيار شقق فندقية أو غرف متصلة." },
            { icon: "fa-shield-halved", title: "الأمان أولاً", text: "سائقون هادئون يقودون بحذر تام على الطرق الجبلية." },
            { icon: "fa-restroom", title: "محطات استراحة", text: "توقفات متكررة للحمامات والوجبات الخفيفة." },
            { icon: "fa-van-shuttle", title: "سيارات واسعة", text: "ميني فان مريحة تتسع لعائلتك الكبيرة وحقائبكم." }
        ]
    },
    'halal-travel-hub': {
        cardsSectionTitle: "Halal-Friendly Travel",
        cardsSectionSubtitle: "Enjoy Georgia with peace of mind. Halal food, private spaces, and respectful guides.",
        cards: [
            {
                img: "tbilisi-old-town-1024.webp", badge: "Dining", tag: "Halal",
                title: "Halal Culinary Scene", subtitle: "Discover authentic Georgian and Middle Eastern Halal cuisine.",
                points: ["Marjanishvili Street", "Turkish & Arab Restaurants", "Halal Georgian Khachapuri", "Prayer Facilities Nearby", "Alcohol-free options"]
            },
            {
                img: "kazbegi-hero-1024.webp", badge: "Nature", tag: "Privacy",
                title: "Private Mountain Villas", subtitle: "Secluded accommodations for ultimate family privacy.",
                points: ["Private Pools", "Secluded Gardens", "Mountain Views", "Family Layouts", "Quiet Surroundings"]
            },
            {
                img: "martvili-opt.webp", badge: "Tours", tag: "Respectful",
                title: "Tailored Excursions", subtitle: "Private tours that respect your values and prayer times.",
                points: ["Schedule around prayer times", "Conservative guides", "Family-centric activities", "Private transport", "No mixed group tours"]
            }
        ],
        featuresTitle: "Our Halal Travel Guarantee",
        features: [
            { icon: "fa-utensils", title: "Halal Restaurants", text: "We exclusively recommend certified or trusted Halal dining." },
            { icon: "fa-mosque", title: "Prayer Times", text: "Itineraries accommodate prayer times and Friday prayers." },
            { icon: "fa-eye-slash", title: "Privacy Assured", text: "Focus on private villas and secluded family activities." },
            { icon: "fa-user-shield", title: "Respectful Drivers", text: "Culturally aware drivers who understand GCC norms." },
            { icon: "fa-wine-glass", title: "Alcohol-Free", text: "We ensure activities and selected accommodations are suitable." },
            { icon: "fa-car", title: "Private Transport", text: "You never share a vehicle with strangers." }
        ]
    },
    'halal-travel-hub-ar': {
        cardsSectionTitle: "السياحة الحلال في جورجيا",
        cardsSectionSubtitle: "استمتع بجمال جورجيا باطمئنان. مطاعم حلال، خصوصية تامة، وأدلة يحترمون قيمك.",
        cards: [
            {
                img: "tbilisi-old-town-1024.webp", badge: "مطاعم", tag: "أكل حلال",
                title: "أشهى المأكولات الحلال", subtitle: "مطاعم عربية وتركية وجورجية تقدم لحوماً مذبوحة حلال.",
                points: ["شارع مرجان شويلي", "مطاعم عربية وتركية", "مخبوزات خشبوري النباتية", "مساجد قريبة", "أجواء عائلية"]
            },
            {
                img: "kazbegi-hero-1024.webp", badge: "سكن", tag: "خصوصية",
                title: "أكواخ وفيلات خاصة", subtitle: "سكن مستقل يوفر الخصوصية التامة للعوائل المحافظة.",
                points: ["مسابح خاصة مغلقة", "حدائق مستقلة", "إطلالات جبلية بعيدة عن الزحام", "مساحات واسعة", "أجواء هادئة"]
            },
            {
                img: "martvili-opt.webp", badge: "جولات", tag: "مريحة",
                title: "جولات تحترم خصوصيتك", subtitle: "رحلات خاصة تتماشى مع مواعيد الصلاة والقيم العائلية.",
                points: ["تعديل الجدول لأوقات الصلاة", "سائقون محترمون", "تجنب الأماكن غير المناسبة", "سيارة خاصة لكم فقط", "لا يوجد جروبات مختلطة"]
            }
        ],
        featuresTitle: "ميزات السياحة الحلال معنا",
        features: [
            { icon: "fa-utensils", title: "مطاعم موثوقة", text: "نرشدك فقط للمطاعم الموثوقة التي تقدم الأكل الحلال." },
            { icon: "fa-mosque", title: "مراعاة الصلاة", text: "نعدل مسار الرحلة ليتناسب مع أوقات الصلاة وصلاة الجمعة." },
            { icon: "fa-eye-slash", title: "خصوصية للعوائل", text: "نركز على الأنشطة والسكن الذي يضمن راحة وخصوصية العائلة." },
            { icon: "fa-user-shield", title: "سائقون محترمون", text: "طاقم عمل على دراية تامة بالثقافة الخليجية وقيمها." },
            { icon: "fa-ban", title: "تجنب الأماكن الصاخبة", text: "نبتعد عن الأماكن المزدحمة أو غير المناسبة للعوائل المحافظة." },
            { icon: "fa-car", title: "سيارة خاصة دائماً", text: "لن تشارك رحلتك أو سيارتك مع أي أشخاص غرباء." }
        ]
    },
    'safety-hub': {
        cardsSectionTitle: "Safety & Comfort",
        cardsSectionSubtitle: "Georgia is one of the safest countries in the world, and we add an extra layer of security.",
        cards: [
            {
                img: "tbilisi-old-town-1024.webp", badge: "Secure", tag: "Low Crime",
                title: "Safe Cities", subtitle: "Tbilisi and Batumi rank among the safest cities globally.",
                points: ["Extremely Low Crime Rate", "Safe to walk at night", "Friendly Locals", "Tourist Police Available", "Welcoming Atmosphere"]
            },
            {
                img: "kazbegi-hero-1024.webp", badge: "Roads", tag: "Transport",
                title: "Safe Mountain Roads", subtitle: "Professional drivers navigating complex terrains safely.",
                points: ["Experienced Mountain Drivers", "Well-maintained Vehicles", "Winter Tires in Season", "No Night Driving in Mountains", "Strict Speed Limits"]
            },
            {
                img: "image-1024.avif", badge: "Health", tag: "Wellbeing",
                title: "Health & Pharmacies", subtitle: "Accessible healthcare and modern pharmacies everywhere.",
                points: ["24/7 Pharmacies", "Modern Hospitals", "Clean Drinking Water", "Fresh Local Food", "Excellent Air Quality"]
            }
        ],
        featuresTitle: "Our Commitment to Your Safety",
        features: [
            { icon: "fa-car-burst", title: "Careful Driving", text: "We strictly monitor our drivers to ensure safe, defensive driving." },
            { icon: "fa-wrench", title: "Maintained Fleet", text: "Regular technical inspections of all our minivans and sedans." },
            { icon: "fa-phone", title: "24/7 Support", text: "Emergency contact available around the clock via WhatsApp." },
            { icon: "fa-language", title: "No Language Barrier", text: "English/Arabic speaking drivers handle all translations." },
            { icon: "fa-shield", title: "Trusted Partners", text: "We only work with vetted hotels and activity providers." },
            { icon: "fa-umbrella", title: "Weather Aware", text: "We adjust mountain itineraries based on real-time weather alerts." }
        ]
    },
    'safety-hub-ar': {
        cardsSectionTitle: "الأمان والراحة",
        cardsSectionSubtitle: "جورجيا من أكثر الدول أماناً في العالم، ونحن نضيف طبقة إضافية من العناية بك.",
        cards: [
            {
                img: "tbilisi-old-town-1024.webp", badge: "أمان", tag: "مدن آمنة",
                title: "مدن آمنة جداً", subtitle: "تبليسي وباتومي تصنفان من أكثر المدن أماناً للسياح.",
                points: ["معدل جريمة شبه معدوم", "أمان تام للعوائل", "شعب مضياف ودود", "شرطة سياحية متعاونة", "أمان في المشي ليلاً"]
            },
            {
                img: "kazbegi-hero-1024.webp", badge: "طرق", tag: "تنقل",
                title: "قيادة آمنة في الجبال", subtitle: "سائقون محترفون للتعامل مع الطرق الجبلية الوعرة.",
                points: ["سائقون متمرسون للجبال", "سيارات مفحوصة دورياً", "إطارات شتوية في موسم الثلج", "تجنب القيادة الليلية في الجبال", "الالتزام بالسرعة القانونية"]
            },
            {
                img: "image-1024.avif", badge: "صحة", tag: "طوارئ",
                title: "صيدليات ورعاية صحية", subtitle: "توفر الصيدليات والخدمات الطبية الحديثة بسهولة.",
                points: ["صيدليات تعمل 24 ساعة", "مستشفيات حديثة", "مياه شرب نقية", "هواء جبلي نقي صحي", "تأمين طبي سهل الاستخدام"]
            }
        ],
        featuresTitle: "التزامنا بسلامتك",
        features: [
            { icon: "fa-car-burst", title: "قيادة حذرة", text: "نراقب جودة قيادة السائقين ونضمن عدم التهور أو السرعة." },
            { icon: "fa-wrench", title: "سيارات معتمدة", text: "فحص فني دوري ومستمر لجميع سياراتنا لضمان سلامتها." },
            { icon: "fa-phone", title: "دعم 24/7", text: "طاقم الدعم متاح على الواتساب للتدخل في أي طارئ." },
            { icon: "fa-language", title: "لا حاجز لغوي", text: "سائقك يتحدث العربية أو الإنجليزية ويتولى الترجمة لك." },
            { icon: "fa-shield", title: "شركاء موثوقون", text: "لا نتعامل إلا مع الفنادق وأماكن الأنشطة ذات السمعة الممتازة." },
            { icon: "fa-cloud-sun", title: "متابعة الطقس", text: "نعدل الجدول مباشرة في حال وجود تحذيرات جوية في الجبال." }
        ]
    }
};

// Regional Overrides (using Arabic layout)
const regionalData = {
    'qa/index.html': { country: "قطر", flight: "الخطوط القطرية (Qatar Airways)", time: "3 ساعات ونصف" },
    'ae/index.html': { country: "الإمارات", flight: "فلاي دبي والعربية للطيران", time: "3 ساعات ونصف" },
    'sa/index.html': { country: "السعودية", flight: "طيران ناس (Flynas) وطيران أديل", time: "4 ساعات" },
    'kw/index.html': { country: "الكويت", flight: "الخطوط الكويتية وطيران الجزيرة", time: "ساعتين ونصف" },
    'eg/index.html': { country: "مصر", flight: "مصر للطيران والعربية مصر", time: "3 ساعات" }
};

for (const [file, data] of Object.entries(regionalData)) {
    contentData[file] = {
        cardsSectionTitle: `رحلتك من ${data.country} إلى جورجيا`,
        cardsSectionSubtitle: `مسار سهل، طيران مباشر، واستقبال من المطار. راحتك تبدأ قبل أن تقلع الطائرة.`,
        cards: [
            {
                img: "tbilisi-old-town-1024.webp", badge: "طيران", tag: "مباشر",
                title: "رحلات جوية مباشرة", subtitle: `سافر بسهولة عبر رحلات مباشرة من ${data.country} إلى تبليسي أو باتومي.`,
                points: [`طيران مباشر عبر ${data.flight}`, `مدة الرحلة حوالي ${data.time}`, "أسعار تذاكر تنافسية", "رحلات يومية متوفرة", "لا حاجة لترانزيت متعب"]
            },
            {
                img: "kazbegi-hero-1024.webp", badge: "فيزا", tag: "سهولة",
                title: "دخول بدون تأشيرة", subtitle: `مواطنو والمقيمون في ${data.country} يدخلون جورجيا بدون فيزا مسبقة.`,
                points: ["إعفاء كامل لمواطني دول الخليج", "المقيمون في الخليج يدخلون بدون فيزا", "إجراءات مطار سريعة وسهلة", "ختم الدخول في المطار مباشرة", "توفير وقت وجهد السفارات"]
            },
            {
                img: "image-1024.avif", badge: "استقبال", tag: "راحة",
                title: "استقبال من المطار", subtitle: "سائقنا الخاص بانتظارك بلوحة باسمك عند بوابة الوصول.",
                points: ["انتظار مجاني في حالة تأخر الرحلة", "مساعدة في حمل الحقائب", "شريحة إنترنت مجانية عند الوصول", "صرف عملات موثوق", "سيارة واسعة تناسب عائلتك"]
            }
        ],
        featuresTitle: `لماذا يفضل المسافرون من ${data.country} خدماتنا`,
        features: [
            { icon: "fa-plane-arrival", title: "استقبال كبار الشخصيات", text: "نوفر استقبالاً يليق بك من لحظة خروجك من المطار." },
            { icon: "fa-car", title: "سيارات عائلية", text: "سيارات ميني فان حديثة ومريحة تتسع لعوائل الخليج بحقائبهم." },
            { icon: "fa-comments", title: "فهم ثقافتكم", text: "طاقمنا يفهم تماماً عادات وتقاليد المسافر الخليجي وما يفضله." },
            { icon: "fa-mosque", title: "مراعاة الخصوصية", text: "نحرص على السكن والأنشطة التي توفر الخصوصية للعائلات المحافظة." },
            { icon: "fa-phone", title: "دفع آمن وسهل", text: "خيارات دفع مرنة وبدون تعقيدات مسبقة ومبالغ فيها." },
            { icon: "fa-umbrella-beach", title: "برامج متكاملة", text: "من الاستقبال للتوديع، لن تحتاج لترتيب أي شيء بنفسك." }
        ]
    };
}

// Function to update the HTML using Cheerio
function processFile(filePath, data) {
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }
    const html = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(html);

    // Update Cards Section Title and Subtitle
    $('h2:contains("برامج السفر المميزة"), h2:contains("Featured Itineraries")').text(data.cardsSectionTitle);
    $('p:contains("كل رحلة مختلفة"), p:contains("Choose the pace that matches your style")').text(data.cardsSectionSubtitle);

    // Update Cards
    const $cards = $('.col-4 .itinerary-card');
    $cards.each((i, card) => {
        if (i < data.cards.length) {
            const cardData = data.cards[i];
            const $card = $(card);
            
            // Image
            $card.find('img').attr('src', filePath.includes('/') ? `../${cardData.img}` : cardData.img);
            
            // Badge
            $card.find('.itinerary-duration-badge').text(cardData.badge);
            
            // Tag (Popular tag or just use the same element)
            if ($card.find('.itinerary-popular-tag').length > 0) {
                $card.find('.itinerary-popular-tag').html(`<i class="fa-solid fa-star"></i> ${cardData.tag}`);
            } else {
                $card.find('.itinerary-card-img').append(`<div class="itinerary-popular-tag" style="background:#112d1e;color:#C29B57;"><i class="fa-solid fa-star"></i> ${cardData.tag}</div>`);
            }
            
            // Title & Subtitle
            $card.find('h3.itinerary-card-title').text(cardData.title);
            $card.find('p.itinerary-card-subtitle').text(cardData.subtitle);
            
            // Points (Days -> Points)
            const $ul = $card.find('ul.itinerary-day-list');
            $ul.empty();
            cardData.points.forEach((point) => {
                $ul.append(`
                    <li class="itinerary-day-item">
                        <span class="itinerary-day-num" style="background:rgba(194,155,87,0.2); color:#112d1e;"><i class="fa-solid fa-check"></i></span>
                        <span>${point}</span>
                    </li>
                `);
            });

            // Update CTA text on card
            const isAr = filePath.includes('-ar') || filePath.includes('/');
            $card.find('.itinerary-card-cta').html(`${isAr ? 'اكتشف المزيد' : 'Learn More'} <i class="fa-solid ${isAr ? 'fa-arrow-left' : 'fa-arrow-right'}"></i>`);
        }
    });

    // Update Features Title
    $('h2:contains("لماذا تسافر معنا"), h2:contains("Why Choose Us")').text(data.featuresTitle);

    // Update Features
    const $features = $('.highlight-item');
    $features.each((i, feat) => {
        if (i < data.features.length) {
            const featData = data.features[i];
            const $feat = $(feat);
            
            $feat.find('.highlight-icon i').attr('class', `fa-solid ${featData.icon}`);
            $feat.find('.highlight-title').text(featData.title);
            $feat.find('.highlight-text').text(featData.text);
        }
    });

    // Update Bottom CTA Banner
    const isAr = filePath.includes('-ar') || filePath.includes('/');
    $('.cta-banner h2').text(isAr ? 'هل أنت مستعد لحجز رحلتك؟' : 'Ready to Book Your Trip?');
    $('.cta-banner p').text(isAr ? 'تواصل معنا على الواتساب لترتيب خطتك المخصصة مجاناً.' : 'Contact us on WhatsApp to arrange your custom plan for free.');
    $('.cta-banner .btn-premium').attr('href', filePath.includes('/') ? '../booking-ar.html' : (isAr ? 'booking-ar.html' : 'booking.html'));

    fs.writeFileSync(filePath, $.html());
    console.log(`Successfully tailored content for: ${filePath}`);
}

Object.keys(contentData).forEach(file => {
    let path = file.includes('/') ? file : `${file}.html`;
    processFile(path, contentData[file]);
});
