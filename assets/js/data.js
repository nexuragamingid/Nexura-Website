/*
 * Nexura site content, shared by the home page, the products page (/produk/) and the product
 * detail page (/produk/detail/?id=<id>).
 * Edit products, prices and the video here. No design work needed.
 *
 * Product fields
 *   featured   shown in "Produk Andalan" on the home page (first three); every product is on /produk/
 *   price      in Rupiah, integer. A colour can override it with its own `price`
 *   compareAt  original price, shown crossed out. Leave out when there is no real original price
 *   stock      "in" | "low" (badge "Stok terakhir") | "out" (badge "Restock segera", button disabled)
 *   popular    rank for the "Terpopuler" sort on /produk/, 1 = best seller. Must be unique
 *   added      launch date as "YYYY-MM-DD", for the "Terbaru" sort on /produk/
 *   colors     the variants a buyer picks from; each points at an image in assets/img (without
 *              -800.webp / .jpg). Usually colours with a `swatch`; without one they show as text
 *   variantLabel  what the variants are called when they are not colours (see Hydrogel Matte).
 *              Default "Warna"
 *   image      used when a product has no colour options
 *
 * Detail page fields. All optional: a section with no data is left out, never shown empty.
 * Features, specs and box contents are taken from the Tokopedia listing photos (Nexura/), so
 * every claim here is one the brand already makes. Add only what is verified.
 *   gallery    photos in order, as { image, alt }. Each needs two JPGs in assets/img:
 *              <image>.jpg (800px) and <image>-160.jpg (thumbnail). Picking a colour jumps to its
 *              image when that image is in the gallery
 *   rating     the listing's average, as shown ("4,9")
 *   ratingCount  number of reviews behind that rating, integer
 *   sold       units sold, integer; shown rounded down ("21rb+ terjual")
 *   description  paragraphs for the Detail Produk tab
 *   showcase   banner images stacked edge to edge under the description so they read as one
 *              long image, as { image, alt }; each is <image>.jpg in assets/img
 *   notice     a usage note, shown as plain text after the description ("Catatan: …"); a
 *              string, or a list of strings for several
 *   phoneModel true when the buyer must type their phone model before adding to the cart
 *   inBox      what is in the box, one line each
 *   usage      { tips: [lines], games: [names] } for "Rekomendasi penggunaan"
 *   sections   extra headed blocks after the showcase, as { title, text }
 *   cover      card image when the product's first variant is not the best shot for a card
 *   tagline    the product's closing line (kept as copy; not shown on the page)
 *   specs      [label, value] rows for the Spesifikasi tab. Kategori and the variant list are
 *              added automatically
 *
 * TODO: popular — ranks 1–12 follow real sold figures: Vortex (100rb+, Tokopedia), then
 * IceGlow (21.136), Hydrogel Matte
 * (10.094), Reflex, Hydrogel Clear HD and Vortex Bundle (all 10rb+, order among them unknown),
 * FrostSpire (8.394), YinYang (7.198), Hydrogel Privacy Matte (3.520), Hydrogel Privacy (850, Shopee), FrostNova
 * (672, Shopee), Hydrogel Privacy HD (591, Shopee); rank 13 is a placeholder. Every `added` date is a
 * placeholder too. Replace both with real figures before launch.
 * TODO: rating / ratingCount / sold — known for IceGlow (rating, sold), Hydrogel Matte (sold), and
 * Reflex and FrostSpire (all three). Fill in the other listings' figures from Tokopedia.
 */
window.NEXURA = {
  categories: {
    'fan-cooler': 'Fan Cooler',
    'sarung-jempol': 'Sarung Jempol',
    'hydrogel': 'Hydrogel',
  },
  // One line under each category's headline on the products page (`all` is Semua Produk).
  categoryLeads: {
    all: 'Fan cooler, sarung jempol, dan hydrogel buat kamu yang serius push rank.',
    'fan-cooler': 'Pendingin HP dengan mode AI dan layar suhu, biar FPS tetap stabil walau main berjam-jam.',
    'sarung-jempol': 'Anti keringat dan ultra sensitif, biar geseran jempol tetap mulus dan aim makin presisi.',
    'hydrogel': 'Pelindung layar anti gores untuk semua tipe HP, tetap responsif buat push rank.',
  },
  // The Bandingkan tab lines specs up by label, but listings name the same spec differently
  // ("Daya" / "Power" / "Power maksimal"). Each alias here is shown under the name it points at.
  // A label not listed keeps its own row. The Spesifikasi tab still shows each listing's wording.
  compareLabels: {
    'Power maksimal': 'Daya',
    'Power': 'Daya',
    'Bilah kipas': 'Jumlah bilah',
    'Cooling system': 'Mode pendinginan',
    'Mode': 'Mode pendinginan',
    'Fan control': 'Kontrol',
    'Display': 'Layar',
    'Kompatibel': 'Kompatibilitas',
  },

  products: [
    {
      id: 'iceglow',
      featured: true,
      category: 'fan-cooler',
      name: 'Fan Cooler IceGlow | Pendingin HP 15W Mode AI & Digital Display',
      short: 'IceGlow',
      price: 159000,
      compareAt: 219000,
      stock: 'in',
      popular: 2,
      added: '2026-08-01',
      keywords: 'kipas pendingin cooler hp ai rgb 15w',
      colors: [
        { id: 'ungu', label: 'Ungu', swatch: '#7B3FE4', image: 'c-iceglow-ungu' },
        { id: 'pink', label: 'Pink', swatch: '#F0A6D6', image: 'c-iceglow-pink' },
        { id: 'hitam', label: 'Hitam', swatch: '#1C1922', image: 'c-iceglow-hitam' },
      ],
      // The card keeps the three-colour lineup rather than the purple shot.
      cover: 'p-iceglow-ungu',
      alt: 'Fan cooler Nexura IceGlow NXI01',
      rating: '4,9',
      sold: 21136,
      gallery: [
        { image: 'p-iceglow-ungu', alt: 'IceGlow NXI01 warna ungu, pink, dan hitam, dengan bonus carbon pouch' },
        { image: 'p-iceglow-hitam', alt: 'IceGlow hitam dengan kecepatan kipas 0 sampai 100' },
        { image: 'g-iceglow-frozen', alt: 'IceGlow ungu menempel di belakang HP' },
        { image: 'g-iceglow-performa', alt: 'IceGlow ungu di antara bongkahan es' },
        { image: 'p-iceglow-pink', alt: 'IceGlow pink dengan ikon 7 bilah turbin, 8000 RPM, layar real-time, dan magnet kuat' },
        { image: 'g-iceglow-display', alt: 'Layar digital IceGlow menunjukkan minus 15 derajat' },
        { image: 'g-iceglow-ai', alt: 'Ilustrasi chip AI yang mengatur kipas sesuai suhu HP' },
        { image: 'g-iceglow-isi', alt: 'Isi paket IceGlow: unit cooler, magnetic pad, kabel Type-C, back clip holder, dan carbon pouch' },
        { image: 'c-iceglow-ungu', alt: 'IceGlow NXI01 warna ungu' },
        { image: 'c-iceglow-pink', alt: 'IceGlow NXI01 warna pink' },
        { image: 'c-iceglow-hitam', alt: 'IceGlow NXI01 warna hitam' },
      ],
      // Copy from the brand's own listing text (10 Oct 2026).
      description: [
        'NEXURA ICEGLOW NXI01 Phone Cooler – Pendingin HP Gaming AI 15W. Quickly Frozen, gaming tetap stabil!',
        'Pasangnya 2in1: tempel pakai magnet atau jepit dengan back clip.',
      ],
      usage: {
        tips: [
          'Gunakan adaptor minimal 18–20W untuk hasil pendinginan optimal.',
          'Pastikan airflow kipas tidak tertutup saat digunakan.',
        ],
        games: ['Mobile Legends', 'PUBG Mobile', 'Free Fire', 'CODM', 'Honkai Star Rail'],
      },
      tagline: 'AI Cooling, Stylish RGB, Everyday Gaming Performance',
      showcase: [
        { image: 'd-iceglow-1', alt: 'IceGlow NXI01 dari Nexura Cooler Ice Series, tersedia warna pink, ungu, dan hitam' },
        { image: 'd-iceglow-2', alt: 'Fitur IceGlow: quickly frozen, overclock speed, digital display, dan AI tech' },
        { image: 'd-iceglow-3', alt: 'IceGlow punya 7 bilah turbin, 8000 RPM, layar daya dan suhu real-time, magnet kuat; isi paket: unit IceGlow, magnetic pad, kabel Type-C, back clip holder, dan carbon pouch' },
      ],
      inBox: [
        '1× NEXURA ICEGLOW Phone Cooler',
        '1× Magnetic Pad',
        '1× Kabel Type-C to C atau Kabel USB to C (random)',
        '1× Back Clip Holder',
        '1× Carbon Pouch (penyimpanan)',
        '1× Kartu Quality Control',
        '1× Panduan Penggunaan',
      ],
      specs: [
        ['Model', 'NXI01'],
        ['Seri', 'Nexura Cooler Ice Series'],
        ['Power maksimal', '15W'],
        ['Cooling system', 'AI Smart Cooling + Manual Control'],
        ['Kecepatan kipas', 'Hingga 8000 RPM'],
        ['Fan control', 'Overclock Speed 0–100'],
        ['Jumlah bilah', '7 Turbine Blades'],
        ['Display', 'Digital LED (real-time power & temperature)'],
        ['Lampu', 'Rainbow RGB Light Effect'],
        ['Port', 'USB Type-C'],
        ['Material', 'Aluminium Alloy + ABS'],
        ['Kompatibilitas', 'iPhone, Android, tablet'],
        ['Garansi', '1 bulan (S&K berlaku)'],
      ],
    },
    {
      id: 'frostbyte',
      featured: true,
      category: 'fan-cooler',
      name: 'Fan Cooler Frostbyte | Pendingin HP 27W 3 Level Digital Display',
      short: 'Frostbyte',
      price: 139000,
      compareAt: 200000,
      stock: 'out',
      popular: 13,
      added: '2026-03-01',
      keywords: 'kipas pendingin cooler hp 27w',
      colors: [
        { id: 'ungu', label: 'Ungu', swatch: '#7B3FE4', image: 'p-frostbyte-ungu' },
        { id: 'putih', label: 'Putih', swatch: '#EDEAF2', image: 'p-frostbyte-varian' },
        { id: 'hitam', label: 'Hitam', swatch: '#1C1922', image: 'p-frostbyte-varian' },
      ],
      alt: 'Fan cooler Nexura Frostbyte NXC01',
      gallery: [
        { image: 'p-frostbyte-ungu', alt: 'Frostbyte NXC01 ungu dengan bonus carbon pouch' },
        { image: 'p-frostbyte-varian', alt: 'Frostbyte dalam tiga warna: ungu, putih, dan hitam' },
        { image: 'g-frostbyte-fitur', alt: 'Frostbyte ungu di belakang HP, dengan ikon 7 bilah, 5000 RPM, aluminium alloy, magnet, dan back clip' },
        { image: 'g-frostbyte-level', alt: 'Layar digital Frostbyte menunjukkan level kipas' },
        { image: 'g-frostbyte-isi', alt: 'Isi paket Frostbyte: unit cooler, magnetic pad, kabel Type-C, back clip holder, dan carbon pouch' },
      ],
      description: [
        'Frostbyte NXC01 adalah pendingin HP 27W dengan bodi aluminium alloy. Kipas 7 bilahnya berputar sampai 5000 RPM, dengan 3 level kecepatan yang kelihatan langsung di layar digital.',
        'Pasangnya pakai magnet atau back clip.',
        'Paketnya lengkap: magnetic pad, kabel Type-C ke Type-C, back clip holder, dan carbon pouch.',
      ],
      inBox: ['1 unit Frostbyte', 'Magnetic pad', 'Kabel USB Type-C ke Type-C', 'Back clip holder', 'Carbon pouch'],
      specs: [
        ['Model', 'NXC01'],
        ['Daya', '27W'],
        ['Kecepatan kipas', '3 level, sampai 5000 RPM'],
        ['Bilah kipas', '7 bilah'],
        ['Material', 'Aluminium alloy'],
        ['Layar', 'Digital, menampilkan level kipas'],
        ['Lampu', 'RGB rainbow'],
        ['Kabel', 'USB Type-C ke Type-C (termasuk)'],
      ],
    },
    {
      id: 'vortex',
      featured: true,
      category: 'sarung-jempol',
      name: 'Sarung Jempol Vortex | Thumb Sleeve Gaming Anti Keringat',
      short: 'Vortex',
      price: 19500,
      compareAt: 49000,
      stock: 'in',
      popular: 1,
      added: '2025-11-01',
      keywords: 'sarung jempol thumb sleeve finger',
      colors: [
        { id: 'merah', label: 'Merah', swatch: '#E0393E', image: 'c-vortex-merah' },
        { id: 'biru', label: 'Biru', swatch: '#2F7DF6', image: 'c-vortex-biru' },
        { id: 'ungu', label: 'Ungu', swatch: '#7B3FE4', image: 'c-vortex-ungu' },
      ],
      // The card keeps the three-colour group shot.
      cover: 'p-vortex',
      alt: 'Sarung jempol Nexura Vortex warna ungu, biru, dan merah',
      rating: '4,7',
      // Tokopedia shows "16,9rb rating"; the exact count isn't given.
      ratingCount: 16900,
      sold: 100000,
      // TODO: thickness is not on the listing.
      gallery: [
        { image: 'p-vortex', alt: 'Sarung jempol Vortex warna ungu, biru, dan merah' },
        { image: 'g-vortex-fitur', alt: 'Dua jempol memakai Vortex saat main game di HP' },
        { image: 'g-vortex-ringan', alt: 'Bulu yang melayang, menggambarkan Vortex yang ringan' },
        { image: 'g-vortex-keringat', alt: 'Kain Vortex dengan butiran air di permukaannya' },
        { image: 'g-vortex-sensitif', alt: 'Main game di HP dengan Vortex di kedua jempol' },
        { image: 'c-vortex-merah', alt: 'Vortex warna Crimson Spiral (merah)' },
        { image: 'c-vortex-biru', alt: 'Vortex warna Blue Pulse (biru)' },
        { image: 'c-vortex-ungu', alt: 'Vortex warna Violet Purple (ungu)' },
      ],
      description: [
        'Level Up Your Aura. Precision in Every Swipe. Buat setiap gerakan jadi lebih akurat dan responsif dengan Sarung Jempol Gaming NEXURA Vortex Series.',
        'Didesain khusus untuk para gamer mobile yang haus kemenangan, Vortex Series hadir dengan desain modern, material premium, dan performa tinggi yang mendukung gameplay kompetitif!',
      ],
      showcase: [
        { image: 'd-vortex-1', alt: 'Vortex thumb sleeve for gaming warna ungu, biru, dan merah; get your Vortex sets: kemasan isi 2 pcs plus sepasang sarung jempol' },
        { image: 'd-vortex-2', alt: 'Tiga warna Vortex: Blue Pulse, Violet Purple, dan Crimson Spiral, dengan ikon premium quality, ultra sensitive, lightweight, sweat absorbent, dan no ghost touch' },
        { image: 'd-vortex-3', alt: 'Keunggulan Vortex: sweat absorbent, level up your aura, lightweight, dan ultra sensitive' },
      ],
      inBox: ['2 pcs sarung jempol (untuk kiri & kanan)'],
      specs: [
        ['Material', 'Silver fiber'],
        ['Kompatibel', 'Semua jenis layar sentuh'],
        ['Ukuran', 'All size, elastis dan nyaman'],
      ],
    },
    {
      id: 'hydrogel-matte',
      featured: true,
      category: 'hydrogel',
      name: 'NEXURA Hydrogel Matte Anti Gores Gaming Untuk Semua Tipe HP | Anti UV, Tahan Air, Penyembuhan Otomatis, Buy 1 Get 1',
      short: 'Hydrogel Matte',
      // Price, rating and sold from the brand's Tokopedia listing (10 Oct 2026).
      price: 44000,
      compareAt: 99000,
      stock: 'in',
      popular: 3,
      added: '2025-09-01',
      keywords: 'hydrogel anti gores screen protector pelindung layar matte',
      // The two cuts the Tokopedia listing sells; the cutting photo in the gallery explains them.
      variantLabel: 'Tipe cutting',
      colors: [
        { id: 'fullscreen', label: 'Fullscreen', image: 'p-hydrogel-matte' },
        { id: 'case-friendly', label: 'Case Friendly', image: 'p-hydrogel-matte' },
      ],
      // Each sheet is cut to the buyer's phone, so the page asks for it before adding to the
      // cart, and the cart line carries it. TODO: hand it to the order once checkout exists.
      phoneModel: true,
      alt: 'Pelindung layar Nexura Hydrogel Matte',
      rating: '4,7',
      ratingCount: 1799,
      sold: 10094,
      gallery: [
        { image: 'p-hydrogel-matte', alt: 'Hydrogel Matte, pelindung layar gaming, beli 1 dapat 2 dengan toolkit' },
        { image: 'g-hgmatte-cutting', alt: 'Perbedaan tipe cutting: Case Friendly dipotong sedikit lebih kecil agar aman dipakai dengan case ketat; Full Screen menutup layar sampai ke tepi dan tidak disarankan untuk pengguna case' },
        { image: 'g-hgmatte-fingerprint', alt: 'Membuka HP dengan sidik jari lewat layar berlapis Hydrogel Matte' },
        { image: 'g-hgmatte-healing', alt: 'Layar HP dengan goresan halus yang hilang di sisi berlapis hydrogel' },
        { image: 'g-hgmatte-hydrophobic', alt: 'Butiran air di atas layar berlapis Hydrogel Matte' },
        { image: 'g-hgmatte-shock', alt: 'Ilustrasi perisai yang menahan benturan di layar HP' },
        { image: 'g-hgmatte-coverage', alt: 'Lembar Hydrogel Matte menutup layar HP sampai tepi' },
      ],
      description: [
        'NEXURA Hydrogel Matte Screen adalah pelindung layar premium dengan lapisan anti silau (matte finish), cocok untuk kamu yang sering main game atau menggunakan HP dalam waktu lama. Desain khusus gaming grade membuat layar tetap responsif, fingerprint tetap terbaca, dan bebas pantulan cahaya berlebih.',
        'Dengan ketebalan ±0,15mm dan teknologi Nano Repair, goresan halus bisa hilang otomatis. Selain itu, dilengkapi lapisan Shockproof + Hydrophobic yang menjaga layar tetap aman, jernih, dan bersih.',
      ],
      inBox: [
        '1 pcs Nexura Hydrogel Matte Screen Protector + bonus 1 varian yang sama',
        '1 pcs Wet Wipes',
        '1 pcs Dry Wipes',
        '1 pcs Microfiber Cloth',
        '2 pcs Dust Absorber Sticker',
        '1 pcs Scraper Card',
      ],
      tagline: 'Layar halus, bebas silau, responsif, dan terlindungi penuh.',
      specs: [
        ['Permukaan', 'Matte finish, anti silau'],
        ['Ketebalan', '±0,15mm'],
        ['Perlindungan', 'Shock proof & explosion proof, Nano Repair, hydrophobic'],
        ['Sidik jari', 'Mendukung sensor sidik jari di layar'],
        ['Kompatibilitas', 'Semua tipe smartphone (cantumkan tipe HP saat order)'],
      ],
    },
    {
      id: 'frostspire',
      featured: false,
      category: 'fan-cooler',
      name: 'Fan Cooler FrostSpire NXC10 | Pendingin HP Khusus Gaming Mode AI, Overclock Speed 27W',
      short: 'FrostSpire',
      // Price, rating, sold and copy from the brand's Tokopedia listing (23 Oct 2026). Both
      // colours are the same price there.
      price: 174000,
      compareAt: 289000,
      stock: 'in',
      popular: 7,
      added: '2026-05-01',
      keywords: 'kipas pendingin cooler hp ai rgb 27w tec overclock',
      colors: [
        { id: 'hitam', label: 'Hitam', swatch: '#1C1922', image: 'c-frostspire-hitam' },
        { id: 'silver', label: 'Silver', swatch: '#C9CCD3', image: 'c-frostspire-silver' },
      ],
      // The card keeps the two-colour lineup rather than the black shot.
      cover: 'p-frostspire-hitam',
      alt: 'Fan cooler Nexura FrostSpire NXC10',
      rating: '4,8',
      ratingCount: 1481,
      sold: 8394,
      gallery: [
        { image: 'p-frostspire-hitam', alt: 'FrostSpire NXC10 silver dan hitam dengan bonus carbon pouch' },
        { image: 'g-frostspire-performa', alt: 'FrostSpire silver dengan layar minus 9 derajat' },
        { image: 'g-frostspire-airflow', alt: 'FrostSpire silver di belakang HP, aliran udara mengarah menjauhi tangan' },
        { image: 'g-frostspire-overclock', alt: 'FrostSpire dengan layar menunjukkan kecepatan 100' },
        { image: 'g-frostspire-fitur', alt: 'FrostSpire silver dengan ikon 7 bilah turbin, 8000 RPM, layar real-time, dan magnet kuat' },
        { image: 'g-frostspire-display', alt: 'Layar digital FrostSpire menunjukkan minus 9 derajat' },
        { image: 'g-frostspire-ai', alt: 'Ilustrasi chip AI yang mengatur kipas sesuai suhu HP' },
        { image: 'g-frostspire-desain', alt: 'Detail bodi FrostSpire silver dengan logo NXC10' },
        { image: 'g-frostspire-isi', alt: 'Isi paket FrostSpire: unit cooler, magnetic pad, kabel Type-C, back clip holder, dan carbon pouch' },
        { image: 'c-frostspire-silver', alt: 'FrostSpire NXC10 warna silver' },
        { image: 'c-frostspire-hitam', alt: 'FrostSpire NXC10 warna hitam' },
      ],
      description: [
        'NEXURA FROSTSPIRE NXC10 Phone Cooler – Pendingin HP Gaming 27W. Dingin maksimal, main sampai beku!',
        'Chipset TEC berdaya tinggi menurunkan suhu HP secara agresif, dan Mode AI menyesuaikan pendinginan dengan suhu HP secara real-time. Kecepatan kipas bisa di-overclock dari 0 sampai 100, dengan 3 level pendinginan (Normal / Ultra / Extreme) yang tampil di layar digital. Dayanya sekitar 17W di level 1, 21W di level 2, dan 27W di level 3.',
        'Pasangnya 2in1: tempel pakai magnet atau jepit dengan back clip.',
      ],
      usage: {
        tips: [
          'Wajib gunakan adaptor minimal 30W untuk performa pendinginan maksimal.',
          'Pastikan airflow tidak tertutup saat digunakan.',
        ],
        games: ['Mobile Legends', 'PUBG Mobile', 'CODM', 'Genshin Impact', 'Honkai: Star Rail'],
      },
      tagline: 'High Performance Cooler – Cool Your Phone to Next Level',
      inBox: [
        '1× NEXURA FrostSpire Phone Cooler',
        '1× Kabel Type-C to C',
        '1× Magnetic Pad',
        '1× Back Clip Holder',
        '1× Carbon Pouch Besar (penyimpanan)',
        '1× Kartu Quality Control',
        '1× Panduan Penggunaan',
      ],
      specs: [
        ['Model', 'NXC10'],
        ['Seri', 'Nexura Cooler Frost Series'],
        ['Power maksimal', '27W'],
        ['Cooling system', 'AI Smart Cooling + Manual Control'],
        ['Kecepatan kipas', 'Hingga 8000 RPM'],
        ['Fan control', 'Overclock Speed 0–100'],
        ['Jumlah bilah', '7 Turbine Blades'],
        ['Display', 'Digital LED (real-time cooling info)'],
        ['Lampu', 'Rainbow RGB Light Effect'],
        ['Port', 'USB Type-C'],
        ['Material', 'Aluminium Alloy + ABS'],
        ['Kompatibilitas', 'iPhone, Android, tablet'],
        ['Garansi', '1 bulan (S&K berlaku)'],
      ],
    },
    {
      id: 'hydrogel-clear',
      featured: false,
      category: 'hydrogel',
      name: 'NEXURA Clear HD Hydrogel Anti Gores Gaming Untuk Semua Tipe HP | Sensitif, Tahan Air, Penyembuhan Otomatis, Buy 1 Get 1',
      short: 'Hydrogel Clear HD',
      // Price, rating and sold from the brand's Tokopedia listing (10 Oct 2026).
      price: 33998,
      compareAt: 99000,
      stock: 'in',
      popular: 5,
      added: '2026-06-01',
      keywords: 'hydrogel anti gores screen protector pelindung layar bening clear',
      variantLabel: 'Tipe cutting',
      colors: [
        { id: 'fullscreen', label: 'Fullscreen', image: 'p-hydrogel-clear' },
        { id: 'case-friendly', label: 'Case Friendly', image: 'p-hydrogel-clear' },
      ],
      phoneModel: true,
      alt: 'Pelindung layar Nexura Hydrogel Clear HD',
      rating: '4,7',
      ratingCount: 1656,
      sold: 10000,
      gallery: [
        { image: 'p-hydrogel-clear', alt: 'Hydrogel Clear HD, pelindung layar gaming, beli 1 dapat 2 dengan toolkit' },
        { image: 'g-hgclear-cutting', alt: 'Perbedaan tipe cutting: Case Friendly dipotong sedikit lebih kecil agar aman dipakai dengan case ketat; Full Screen menutup layar sampai ke tepi dan tidak disarankan untuk pengguna case' },
        { image: 'g-hgclear-hd', alt: 'Lembar Hydrogel Clear HD di atas layar HP yang jernih' },
        { image: 'g-hgclear-touch', alt: 'Main game di HP berlapis Hydrogel Clear HD' },
        { image: 'g-hgclear-healing', alt: 'Ujung alat menggores layar berlapis hydrogel tanpa meninggalkan bekas' },
        { image: 'g-hgclear-hydrophobic', alt: 'Butiran air di permukaan layar berlapis hydrogel' },
        { image: 'g-hgclear-shock', alt: 'Ilustrasi perisai yang menahan benturan di layar HP' },
        { image: 'g-hgclear-coverage', alt: 'Jari memasang lembar hydrogel sampai tepi layar' },
      ],
      description: [
        'NEXURA Hydrogel Clear HD adalah pelindung layar berbahan Premium Hydrogel Film dengan ketebalan ±0,15mm yang dirancang khusus untuk gaming & aktivitas harian.',
        'Menggunakan teknologi Self Healing & Nano Repair Layer, goresan ringan akan hilang dengan sendirinya, layar tetap mulus seperti baru.',
        'Finishing HD Clear membuat layar tetap jernih tanpa mengurangi sensitivitas sentuhan. Cocok untuk kamu yang butuh respons cepat saat bermain game maupun penggunaan sehari-hari.',
      ],
      inBox: [
        '2 pcs Nexura Hydrogel Screen Protector (Clear HD) + bonus 1 varian yang sama',
        '1 pcs Wet Wipes',
        '1 pcs Dry Wipes',
        '1 pcs Microfiber Cloth',
        '2 pcs Dust Absorber Sticker',
        '1 pcs Scraper Card',
      ],
      tagline: 'Layar smartphone yang jernih, responsif, dan tahan lama.',
      specs: [
        ['Permukaan', 'HD Clear, jernih'],
        ['Ketebalan', '±0,15mm'],
        ['Perlindungan', 'Shock proof, Self Healing & Nano Repair, hydrophobic'],
        ['Kompatibilitas', 'Semua tipe smartphone (cantumkan tipe HP saat order)'],
      ],
    },
    {
      // Copy, price and figures from the brand's Tokopedia listing (10 Oct 2026). The sold figure
      // is the exact 3.520 recorded with the store figures above.
      id: 'hydrogel-privacy',
      featured: false,
      category: 'hydrogel',
      name: 'NEXURA Hydrogel Privacy Matte Anti Gores Gaming Untuk Semua Tipe HP | Anti UV, Anti Spy, Super Licin, Penyembuhan Otomatis',
      short: 'Hydrogel Privacy Matte',
      price: 54000,
      compareAt: 179000,
      stock: 'in',
      popular: 9,
      added: '2026-07-01',
      keywords: 'hydrogel anti gores screen protector pelindung layar privacy anti spy anti intip matte',
      variantLabel: 'Tipe cutting',
      colors: [
        { id: 'fullscreen', label: 'Fullscreen', image: 'p-hydrogel-privacy' },
        { id: 'case-friendly', label: 'Case Friendly', image: 'p-hydrogel-privacy' },
      ],
      phoneModel: true,
      alt: 'Pelindung layar Nexura Hydrogel Privacy Matte',
      rating: '4,6',
      ratingCount: 571,
      sold: 3520,
      gallery: [
        { image: 'p-hydrogel-privacy', alt: 'Hydrogel Privacy Matte, pelindung layar gaming, beli 1 dapat 2 dengan toolkit' },
        { image: 'g-hgprivacy-cutting', alt: 'Perbedaan tipe cutting: Case Friendly dipotong sedikit lebih kecil agar aman dipakai dengan case ketat; Full Screen menutup layar sampai ke tepi dan tidak disarankan untuk pengguna case' },
        { image: 'g-hgprivacy-matte', alt: 'HP dengan Hydrogel Privacy Matte: jelas dari depan, gelap dari samping' },
        { image: 'g-hgprivacy-private', alt: 'Lembar Hydrogel Privacy Matte dipasang di layar HP' },
        { image: 'g-hgprivacy-shock', alt: 'Bola baja di atas lapisan hydrogel, menggambarkan tahan benturan' },
        { image: 'g-hgprivacy-coverage', alt: 'Lembar hydrogel menutup layar HP sampai tepi' },
        { image: 'g-hgprivacy-hydrophobic', alt: 'Butiran air di atas layar berlapis Hydrogel Privacy Matte' },
        { image: 'g-hgprivacy-repair', alt: 'Layar HP dengan goresan halus yang hilang di sisi berlapis hydrogel' },
      ],
      notice: 'Lapisan privacy membuat sensor sidik jari di layar jadi kurang responsif.',
      description: [
        'NEXURA Hydrogel Privacy Matte adalah pelindung layar premium dengan lapisan anti-intip + anti-silau (matte) yang membuat layar hanya terlihat jelas ketika dilihat lurus dari depan, sekaligus mengurangi pantulan cahaya & sidik jari agar tetap nyaman digunakan di luar ruangan maupun saat gaming.',
        'Dengan ketebalan hanya ±0,15mm, Hydrogel Gaming Grade ini memberikan pengalaman geser lebih halus, visual lebih lembut (soft matte), serta proteksi penuh dari goresan, gesekan, dan benturan ringan.',
      ],
      inBox: [
        '2 pcs Nexura Hydrogel Privacy Matte Screen Protector',
        '1 pcs Wet Wipes',
        '1 pcs Dry Wipes',
        '1 pcs Microfiber Cloth',
        '2 pcs Dust Absorber Sticker',
        '1 pcs Scraper Card',
      ],
      tagline: 'Layar yang halus, private, dan bebas pantulan, untuk gaming maupun aktivitas harian.',
      specs: [
        ['Permukaan', 'Privacy (anti spy) + matte anti-glare'],
        ['Ketebalan', '±0,15mm'],
        ['Perlindungan', 'Shock & scratch resistant, Nano Repair, hydrophobic + oleophobic'],
        ['Sidik jari', 'Sensor di layar kurang responsif karena lapisan privacy'],
        ['Kompatibilitas', 'Semua tipe smartphone (cantumkan tipe HP saat order)'],
      ],
    },
    {
      // Copy, price and figures from the brand's Tokopedia listing (10 Oct 2026). The sold figure
      // is the exact 7.198 recorded with the store figures above. `short` matches the product
      // name the buyer reviews below are filed under, so they show in the Ulasan tab.
      id: 'yinyang',
      featured: false,
      category: 'sarung-jempol',
      name: 'NEXURA Yin Yang Series Sarung Jempol Gaming Limited Edition, Super Responsif & Kualitas Premium',
      short: 'YinYang Series',
      price: 64000,
      compareAt: 189000,
      stock: 'in',
      popular: 8,
      added: '2026-04-01',
      keywords: 'sarung jempol thumb sleeve finger sleeve yinyang yin yang naga dragon 4 pcs',
      image: 'p-yinyang',
      alt: 'Sarung jempol Nexura YinYang Series, naga merah-emas dan biru-es, isi 4 pcs',
      rating: '4,9',
      ratingCount: 1272,
      sold: 7198,
      gallery: [
        { image: 'p-yinyang', alt: 'YinYang Series: sarung jempol naga merah-emas dan biru-es, isi 4 pcs' },
        { image: 'g-yinyang-box', alt: 'Empat sarung jempol YinYang dengan kotak premium edisi naga' },
        { image: 'g-yinyang-pro', alt: 'Dua jempol memakai YinYang merah dan biru, dengan ikon premium quality, ultra sensitive, lightweight, sweat absorbent, dan pro level experience' },
        { image: 'g-yinyang-premium', alt: 'Close-up YinYang merah-emas dan biru-es' },
        { image: 'g-yinyang-responsive', alt: 'Main game di HP dengan YinYang di kedua jempol' },
        { image: 'g-yinyang-ringan', alt: 'Bulu-bulu melayang, menggambarkan YinYang yang ringan' },
        { image: 'g-yinyang-keringat', alt: 'Kain YinYang dengan butiran air di permukaannya' },
        { image: 'g-yinyang-experience', alt: 'Gamer bersorak sambil main HP, dengan sepasang YinYang' },
      ],
      description: [
        'NEXURA YinYang Series – Premium Thumb Sleeves (4 pcs). Gear Your Aura – Swing Your Thumb Like a Pro.',
        'Rasakan pengalaman bermain seperti PRO dengan NEXURA YinYang Series, sarung jempol gaming premium dengan desain naga Yin & Yang yang melambangkan keseimbangan, presisi, dan kekuatan.',
        'Didesain khusus untuk pemain kompetitif yang butuh akurasi tinggi.',
      ],
      sections: [
        {
          title: 'Desain eksklusif – Dragon YinYang Series',
          text: 'Terinspirasi dari 2 naga kekuatan Yin & Yang, melambangkan keseimbangan, fokus, dan ketenangan dalam gameplay. Desain elegan, premium, dan berbeda dari thumb sleeves lain di pasaran.',
        },
      ],
      inBox: [
        '4 pcs NEXURA YinYang Series',
        '2 warna dalam satu set: Red-Gold Dragon & Blue-Ice Dragon',
        'Kotak premium edisi YinYang Dragon',
      ],
      usage: { games: ['Mobile Legends', 'PUBG Mobile', 'CODM', 'Free Fire', 'Honor of Kings'] },
      tagline: 'Gear Your Aura – Swing Your Thumb Like a Pro.',
      specs: [
        ['Seri', 'YinYang Series, Limited Edition'],
        ['Material', 'Serat kain impor'],
        ['Warna', 'Red-Gold Dragon & Blue-Ice Dragon (2 pcs per warna)'],
        ['Ukuran', 'All size, elastis dan nyaman'],
        ['Kompatibel', 'Semua jenis layar sentuh'],
      ],
    },
    {
      // Copy, price and figures from the brand's Tokopedia listing (10 Oct 2026). One box holds
      // all three colours, so there is no picker.
      id: 'vortex-bundle',
      featured: false,
      category: 'sarung-jempol',
      name: 'NEXURA Vortex Bundle 6PCS Sarung Jempol Gaming Responsif, Anti Keringat, & Kualitas Premium + Gratis Pouch Carbon',
      short: 'Vortex Bundle',
      price: 24500,
      compareAt: 159000,
      stock: 'in',
      popular: 6,
      added: '2026-02-01',
      keywords: 'sarung jempol thumb sleeve finger sleeve vortex bundle 6 pcs pouch carbon',
      image: 'p-vortex-bundle',
      alt: 'Vortex Bundle: 6 sarung jempol Nexura warna biru, ungu, dan merah dengan pouch carbon',
      rating: '4,8',
      ratingCount: 1838,
      sold: 10000,
      gallery: [
        { image: 'p-vortex-bundle', alt: 'Vortex Bundle: 6 pcs thumb sleeve biru, ungu, dan merah plus pouch carbon' },
        // TODO: this listing photo says "#1 sarung jempol fleksibel"; the PRD rules out a #1
        // claim without proof, so drop it unless there is a source for it.
        { image: 'g-vxbundle-fleksibel', alt: 'Sepasang sarung jempol Vortex ungu, bahan lembut dan fleksibel' },
        { image: 'g-vxbundle-aura', alt: 'Dua jempol memakai Vortex di atas layar HP, dengan ikon premium quality, lightweight, no ghost touch, ultra sensitive, dan sweat absorbent' },
        { image: 'g-vxbundle-sensitive', alt: 'Main game di HP dengan Vortex di kedua jempol' },
        { image: 'g-vxbundle-ringan', alt: 'Bulu-bulu melayang, menggambarkan Vortex yang ringan' },
        { image: 'g-vxbundle-keringat', alt: 'Kain Vortex ungu dengan butiran air di permukaannya' },
      ],
      description: [
        'NEXURA Vortex Edition – Sarung Jempol Gaming. Level Up Your Aura. Precision in Every Swipe.',
        'Buat setiap gerakan jadi lebih akurat dan responsif dengan Sarung Jempol Gaming NEXURA Vortex Series. Didesain khusus untuk para gamer mobile yang haus kemenangan, Vortex Series hadir dengan desain modern, material premium, dan performa tinggi yang mendukung gameplay kompetitif!',
      ],
      sections: [
        {
          title: 'Kenapa pilih NEXURA?',
          text: 'Produk dari brand gaming lokal yang fokus pada performa dan desain. NEXURA menggabungkan kualitas tinggi dengan harga terjangkau.',
        },
      ],
      inBox: [
        '6 pcs sarung jempol, 3 warna (untuk kiri & kanan)',
        'Pouch Carbon',
      ],
      tagline: 'High Quality, Low Price – karena semua gamer pantas untuk tampil maksimal!',
      specs: [
        ['Seri', 'Vortex Edition'],
        ['Material', 'Silver Fiber'],
        ['Warna', 'Crimson Spiral, Blue Pulse, Violet Eclipse (Limited Edition)'],
        ['Ukuran', 'All size, elastis dan nyaman'],
        ['Kompatibel', 'Semua jenis layar sentuh'],
      ],
    },
    {
      // From the brand's Shopee listing and launch banner (10 Oct 2026). Sold out there too.
      // TODO: the listing prices it Rp400.000–Rp420.000 by colour; set the dearer colour's
      // `price` once it is known. Add the full copy and more photos when it restocks.
      id: 'frostnova',
      featured: false,
      category: 'fan-cooler',
      name: 'NEXURA Fan Cooler FrostNova | Raja-nya Pendingin HP Gaming | Instant Freeze 30W',
      short: 'FrostNova',
      price: 400000,
      stock: 'out',
      popular: 11,
      added: '2026-09-15',
      keywords: 'kipas pendingin cooler hp ai rgb 30w frostnova nx005',
      colors: [
        { id: 'ungu-gelap', label: 'Ungu Gelap', swatch: '#5B1F9E', image: 'p-frostnova' },
        { id: 'putih', label: 'Putih', swatch: '#EDEAF2', image: 'p-frostnova' },
      ],
      alt: 'Fan cooler Nexura FrostNova NX005 warna ungu dan putih',
      rating: '4,8',
      ratingCount: 347,
      sold: 672,
      gallery: [
        { image: 'p-frostnova', alt: 'FrostNova NX005, phone cooler 30W warna ungu dan putih, dengan bonus carbon pouch besar' },
      ],
      description: [
        'FrostNova NX005 adalah phone cooler gaming 30W dengan AI Tech, kipas 7 turbine blades berkecepatan 5000–5600 RPM, dan layar real-time untuk daya dan suhu. Pasangnya cukup ditempel pakai magnet.',
        'Bonus carbon pouch besar untuk penyimpanan.',
      ],
      specs: [
        ['Model', 'NX005'],
        ['Power', '30W'],
        ['Kecepatan kipas', '5000–5600 RPM'],
        ['Bilah kipas', '7 Turbine Blades'],
        ['Display', 'Real-time power & temperature'],
        ['Lampu', 'Rainbow RGB'],
        ['Bonus', 'Large Carbon Pouch'],
      ],
    },
    {
      // From the brand's Shopee listing and banner (10 Oct 2026). Sold out there too.
      // TODO: add the full listing copy and more photos when it restocks.
      id: 'hydrogel-privacy-hd',
      featured: false,
      category: 'hydrogel',
      name: 'NEXURA Hydrogel Privacy HD Anti Gores Gaming Semua Tipe HP | Super Licin, Anti Spy, Clear+, Penyembuhan Otomatis, Buy 1 Get 1',
      short: 'Hydrogel Privacy HD',
      price: 79000,
      compareAt: 179000,
      stock: 'out',
      popular: 12,
      added: '2026-08-15',
      keywords: 'hydrogel anti gores screen protector pelindung layar privacy anti spy anti intip hd clear',
      variantLabel: 'Tipe cutting',
      colors: [
        { id: 'fullscreen', label: 'Fullscreen', image: 'p-hydrogel-privacy-hd' },
        { id: 'case-friendly', label: 'Case Friendly', image: 'p-hydrogel-privacy-hd' },
      ],
      phoneModel: true,
      alt: 'Pelindung layar Nexura Hydrogel Privacy HD',
      rating: '4,6',
      ratingCount: 246,
      sold: 591,
      gallery: [
        { image: 'p-hydrogel-privacy-hd', alt: 'Hydrogel Privacy HD, pelindung layar gaming, beli 1 dapat 2 dengan toolkit' },
      ],
      notice: 'Lapisan privacy membuat sensor sidik jari di layar jadi kurang responsif.',
      description: [
        'NEXURA Hydrogel Privacy HD adalah pelindung layar anti-intip dengan finishing Clear+: layar tetap jernih dari depan dan gelap dari samping, super licin buat gaming.',
        'Beli 1 dapat 1 varian yang sama, plus toolkit pemasangan.',
      ],
      inBox: ['2 lembar Hydrogel Privacy HD (varian yang sama)', 'Toolkit pemasangan'],
      specs: [
        ['Permukaan', 'Privacy (anti spy) + Clear+'],
        ['Perlindungan', 'Explosion-proof & shock-proof, Nano Repair, hydrophobic & oleophobic'],
        ['Sidik jari', 'Sensor di layar kurang responsif karena lapisan privacy'],
        ['Kompatibilitas', 'Semua tipe HP (cantumkan tipe HP saat order)'],
      ],
    },
    {
      // From the brand's Shopee listing and banner (10 Oct 2026). Sold out there too.
      // TODO: add the full listing copy and more photos when it restocks.
      id: 'hydrogel-privacy-std',
      featured: false,
      category: 'hydrogel',
      name: 'NEXURA Hydrogel Privacy Anti Gores Gaming Untuk Semua Tipe HP | Anti Spy, Tahan Air, Penyembuhan Otomatis, Buy 1 Get 1',
      short: 'Hydrogel Privacy',
      price: 149000,
      stock: 'out',
      popular: 10,
      added: '2026-03-15',
      keywords: 'hydrogel anti gores screen protector pelindung layar privacy anti spy anti intip',
      variantLabel: 'Tipe cutting',
      colors: [
        { id: 'fullscreen', label: 'Fullscreen', image: 'p-hydrogel-privacy-std' },
        { id: 'case-friendly', label: 'Case Friendly', image: 'p-hydrogel-privacy-std' },
      ],
      phoneModel: true,
      alt: 'Pelindung layar Nexura Hydrogel Privacy',
      rating: '4,7',
      ratingCount: 388,
      sold: 850,
      gallery: [
        { image: 'p-hydrogel-privacy-std', alt: 'Hydrogel Privacy, pelindung layar gaming, beli 1 dapat 2 dengan toolkit' },
      ],
      notice: 'Lapisan privacy membuat sensor sidik jari di layar jadi kurang responsif.',
      description: [
        'NEXURA Hydrogel Privacy adalah pelindung layar anti-intip untuk gaming: layar hanya terlihat jelas dari depan, tahan air, dan goresan halus pulih sendiri.',
        'Beli 1 dapat 1 varian yang sama, plus toolkit pemasangan.',
      ],
      inBox: ['2 lembar Hydrogel Privacy (varian yang sama)', 'Toolkit pemasangan'],
      specs: [
        ['Permukaan', 'Privacy (anti spy)'],
        ['Perlindungan', 'Shock proof, self healing, hydrophobic'],
        ['Sidik jari', 'Sensor di layar kurang responsif karena lapisan privacy'],
        ['Kompatibilitas', 'Semua tipe HP (cantumkan tipe HP saat order)'],
      ],
    },
    {
      // Copy, price and figures from the brand's Tokopedia listing (10 Oct 2026).
      id: 'reflex',
      featured: false,
      category: 'sarung-jempol',
      name: 'NEXURA Reflex Series Sarung Jempol Gaming Responsif, Anti Keringat, Design Cosmic Luar Angkasa',
      short: 'Reflex',
      price: 10500,
      compareAt: 79000,
      stock: 'in',
      popular: 4,
      added: '2026-09-01',
      keywords: 'sarung jempol thumb sleeve finger sleeve reflex cosmic reflektif',
      // The card shows the six-colour lineup rather than whichever colour is listed first.
      cover: 'p-reflex',
      colors: [
        { id: 'merah', label: 'Merah', swatch: '#E0393E', image: 'p-reflex-merah' },
        { id: 'biru', label: 'Biru', swatch: '#2F7DF6', image: 'p-reflex-biru' },
        { id: 'kuning', label: 'Kuning', swatch: '#F2B705', image: 'p-reflex-kuning' },
        { id: 'hijau', label: 'Hijau', swatch: '#2DB84C', image: 'p-reflex-hijau' },
        { id: 'ungu', label: 'Ungu', swatch: '#7B3FE4', image: 'p-reflex-ungu' },
        { id: 'cosmic', label: 'Cosmic', swatch: '#111014', image: 'p-reflex-cosmic' },
      ],
      alt: 'Sarung jempol Nexura Reflex dalam enam warna',
      rating: '4,8',
      ratingCount: 1637,
      sold: 10000,
      gallery: [
        { image: 'p-reflex', alt: 'Sarung jempol Reflex dalam enam warna: hijau, merah, cosmic, ungu, biru, dan kuning' },
        { image: 'g-reflex-kemasan', alt: 'Kemasan Reflex isi 2 pcs dengan desain premium' },
        { image: 'g-reflex-warna', alt: 'Sepasang Reflex cosmic dikelilingi warna-warna lainnya' },
        { image: 'g-reflex-fitur', alt: 'Main game di HP pakai Reflex, dengan ikon premium quality, ultra sensitive, lightweight, sweat absorbent, dan no ghost touch' },
        { image: 'g-reflex-kualitas', alt: 'Close-up bahan Reflex cosmic dengan bintik reflektif warna-warni' },
        { image: 'p-reflex-merah', alt: 'Sepasang Reflex warna merah' },
        { image: 'p-reflex-biru', alt: 'Sepasang Reflex warna biru' },
        { image: 'p-reflex-kuning', alt: 'Sepasang Reflex warna kuning' },
        { image: 'p-reflex-hijau', alt: 'Sepasang Reflex warna hijau' },
        { image: 'p-reflex-ungu', alt: 'Sepasang Reflex warna ungu' },
        { image: 'p-reflex-cosmic', alt: 'Sepasang Reflex warna cosmic' },
      ],
      description: [
        'NEXURA Reflex Cosmic Series. Level Up Your Aura. Reflect Your Skill.',
        'Rasakan pengalaman bermain yang lebih responsif, ringan, dan presisi dengan NEXURA Reflex Cosmic Series. Hadir dengan konsep cosmic reflective color, sarung jempol ini bukan cuma nyaman dipakai, tapi juga punya tampilan futuristik yang standout saat terkena cahaya.',
        'Didesain khusus untuk gamer mobile yang butuh kontrol maksimal di setiap swipe, tap, dan drag.',
      ],
      sections: [
        {
          title: 'Cosmic reflective concept',
          text: 'Terinspirasi dari cahaya galaksi, nebula, aurora, dan ledakan bintang di luar angkasa, NEXURA Reflex Cosmic Series hadir dengan desain bintik reflektif yang memberikan kesan premium, futuristik, dan berbeda dari sarung jempol biasa.',
        },
        {
          title: 'Kenapa harus NEXURA?',
          text: 'NEXURA adalah brand gaming lokal yang fokus menghadirkan produk berkualitas tinggi dengan desain modern dan harga terjangkau. Dibuat untuk gamer yang ingin performa maksimal tanpa mengorbankan style.',
        },
      ],
      showcase: [
        { image: 'd-reflex-1', alt: 'Reflex cosmic dengan ikon premium quality, ultra sensitive, lightweight, sweat absorbent, dan no ghost touch; pilih warnamu' },
        { image: 'd-reflex-2', alt: 'Reflex ultra responsive, lightweight, dan premium quality' },
        { image: 'd-reflex-3', alt: 'Reflex sweat absorbent; isi kotak: sepasang finger sleeve Nexura Reflex' },
      ],
      inBox: ['2 pcs sarung jempol, kiri & kanan'],
      usage: { games: ['Mobile Legends', 'PUBG Mobile', 'Free Fire', 'CODM', 'Honor of Kings', 'Fortnite'] },
      tagline: 'High Quality, Low Price. Karena semua gamer pantas tampil maksimal.',
      specs: [
        ['Seri', 'Reflex Cosmic Series'],
        ['Material', 'Silver Fiber + Reflective Fabric'],
        ['Ukuran', 'All size, elastis dan nyaman'],
        ['Kompatibel', 'Semua jenis layar sentuh smartphone'],
      ],
    },
  ],

  // Links the detail page offers next to the buy buttons.
  // TODO: the WhatsApp number is the same placeholder the footer carries; replace both together.
  store: {
    whatsapp: '6212345678901',
    tokopedia: 'https://www.tokopedia.com/nexura-gear',
    // Tanggal rating, jumlah ulasan, dan terjual di data produk terakhir disalin dari Tokopedia
    // (tahun-bulan-tanggal). Ganti setiap kali angkanya diperbarui; tampil di tab Ulasan.
    metricsUpdated: '2026-10-16',
  },

  /*
   * Checkout page (/checkout/).
   *   couriers   delivery options, cheapest first; the first is picked by default. `days` is the
   *              delivery estimate as [earliest, latest] days from today
   *   insurance  shipping insurance: a share of the goods total, never below `min`
   *   payments   in the order the page lists them, all shown; the same set as the footer's
   *              Payment Method logos. `logo` is a file in assets/img/pay
   *   promos     code → { label, off } where `off` is Rupiah off the goods total. Codes are
   *              matched ignoring case. Empty: every code is refused
   * TODO: courier prices and estimates are placeholders until the courier contract is signed.
   * TODO: payment methods are a proposal; keep only the ones the payment gateway enables.
   */
  checkout: {
    couriers: [
      { id: 'hemat', label: 'Hemat', price: 8000, days: [4, 6] },
      { id: 'reguler', label: 'Reguler', price: 12000, days: [2, 3] },
      { id: 'express', label: 'Express', price: 22000, days: [1, 1] },
    ],
    insurance: { rate: 0.002, min: 1500 },
    // Minutes a QRIS code stays payable after Bayar Sekarang; the payment page counts it down.
    // TODO: match the expiry set at the payment gateway.
    qrisMinutes: 15,
    payments: [
      { id: 'qris', label: 'QRIS', logo: 'qris.svg', w: 24, h: 24, bare: true, note: 'Scan dari aplikasi mana pun' },
      { id: 'gopay', label: 'GoPay', logo: 'gopay.svg', w: 63, h: 16 },
      { id: 'ovo', label: 'OVO', logo: 'ovo.svg', w: 77, h: 24 },
      { id: 'dana', label: 'DANA', logo: 'dana.png', w: 260, h: 76 },
      { id: 'shopeepay', label: 'ShopeePay', logo: 'shopeepay.png', w: 159, h: 130 },
    ],
    promos: {},
  },

  // Compilation video for "Apa Kata Streamers". Paste the YouTube video ID (the part after v=).
  video: {
    youtubeId: '',
    title: 'Kompilasi streamer pakai Nexura',
  },

  /*
   * Angka di section "Apa Kata Pembeli".
   * Diambil dari halaman Ulasan toko Nexura Gear (Tokopedia & TikTok Shop by Tokopedia),
   * Oktober 2026:
   *   sold         318 rb terjual (angka toko, sudah dibulatkan oleh Tokopedia)
   *   rating       4,8 / 5,0 — 96% pembeli merasa puas
   *   reviewCount  10.859 penilaian (9.773 bintang 5 · 740 bintang 4 · 158 bintang 3 ·
   *   reviewTotal  57 bintang 2 · 131 bintang 1), 1.552 di antaranya disertai ulasan tertulis
   *
   * Karena itu label ketiga "Penilaian", bukan "Ulasan": 10.859 adalah jumlah rating;
   * ulasan tertulisnya cuma 1.552. Angka Shopee belum masuk sama sekali, jadi Shopee
   * tidak disebut di baris sumber.
   *
   * `rating` 4,8 adalah rata-rata persis, bukan batas bawah. Kalau Shopee nanti ikut
   * dihitung, rata-ratanya harus berbobot:
   *   (4,8 x 10.859 + rating_shopee x jumlah_shopee) / (10.859 + jumlah_shopee)
   */
  social: {
    sold: '300rb+',
    rating: '4,8',
    reviewCount: '10rb+',
    // the source line under the band: the exact count across both shops, and when it was taken
    reviewTotal: '10.859',
    asOf: 'Okt 2026',
  },

  /*
   * Ulasan pembeli asli dari Tokopedia/nexura-gear, diambil 8 Oktober 2026.
   *
   * Teksnya dikutip dari ulasan sungguhan. Yang dirapikan hanya dua hal: label formulir
   * Tokopedia ("Kejernihan lensa:", "Kualitas pengerjaan:", "Performa sistem:") dibuang,
   * dan salah ketik yang jelas diperbaiki. Slang-nya sengaja dibiarkan apa adanya.
   *
   * `name` adalah nama pengulas persis seperti yang Tokopedia tampilkan ke publik. Semua
   * pengulas di toko ini memilih ulasan anonim, dan untuk ulasan anonim Tokopedia menyamarkan
   * namanya sendiri jadi bentuk 'O***p' — jadi itu nama asli yang disamarkan, bukan inisial
   * yang kita karang. (Pengulas yang tidak anonim tampil nama penuh, misalnya 'Chika'; di
   * toko ini belum ada.)
   *
   * JANGAN mengganti nama-nama ini dengan nama karangan supaya kelihatan lebih bagus: itu
   * mengubah ulasan asli jadi testimoni palsu. Kalau mau nama penuh yang beneran, ambil dari
   * Seller Center — penjual bisa melihat nama pembelinya sendiri — lalu minta izin dulu
   * sebelum dipajang.
   *
   * `product` mengikuti listing tempat ulasan itu benar-benar ditulis, bukan tebakan dari isi
   * teksnya.
   */
  reviews: [
    // Ulasan beranda: dua puluh ini, urut seperti yang ditampilkan. Di beranda yang tampil
    // adalah tangkapan layar aslinya dari Tokopedia (`screenshot`, assets/img/reviews/
    // <nama>.webp), apa adanya, dipotong per ulasan dan diberi ruang putih di bawah supaya
    // ukurannya sama semua (620 x 304). `text` adalah isinya kata per kata seperti di
    // tangkapan layar (termasuk "…" kalau Tokopedia memotongnya), dipakai sebagai teks
    // alternatif gambar dan di halaman produk. `highlight` adalah potongan kata per kata dari
    // `text` itu sendiri, yang muncul sebagai stiker di atas tangkapan layarnya.
    { rating: 5, name: 'D***z', product: 'Hydrogel Matte', variant: 'Case Friendly', home: true, screenshot: 'ulasan-01', highlight: 'presisi banget',
      text: 'Kejernihan lensa: bagus dan nyaman di lihat Kualitas pengerjaan: mantap presisi banget responsif buat sentuh sentuh hydrogel mattenya agak kurang tapi masih mantul sentuh…' },
    { rating: 5, name: 'K***m', product: 'Hydrogel Matte', variant: 'Fullscreen', home: true, screenshot: 'ulasan-02', highlight: 'lancar banget',
      text: 'Kejernihan lensa: Jernih Kualitas pengerjaan: Sangat bagus Performa: Buat gaming lancar banget, layar HP juga langsung licin banget' },
    { rating: 5, name: 'L***f', product: 'Hydrogel Matte', variant: 'Case Friendly', home: true, screenshot: 'ulasan-03', highlight: 'Gacorr licinnn',
      text: 'Performa: Gacorr licinnn bangett kayaa udahh pakee bedakkk minnn kerenn bangett nihh hydrogel nexura next beli lagi di sini mungkin sekali kali bakalan beli Fan colerr sa…' },
    { rating: 5, name: 'O***x', product: 'Hydrogel Matte', variant: 'Case Friendly', home: true, screenshot: 'ulasan-04', highlight: 'bagus banget',
      text: 'bagus banget bisa sidik jari di layar, responsif, sama jernih banget, mana hydrogel nya di kasih 2 lagi jadi kalo semisalkan yang pertama gagal bisa pake yang ke2' },
    { rating: 5, name: 'I***o', product: 'Hydrogel Matte', variant: 'Case Friendly', home: true, screenshot: 'ulasan-05', highlight: 'Jernih banget',
      text: 'Kualitas pengerjaan: Sangat mudah Kejernihan lensa: Jernih banget dan licin buat main game' },
    { rating: 5, name: 'X***u', product: 'IceGlow', variant: 'Hitam', home: true, screenshot: 'ulasan-06', highlight: 'Semuanya bagus',
      text: 'Semuanya bagus, minus nya mungkin ada kesalahan pada jepitan nya' },
    { rating: 5, name: 'F***w', product: 'IceGlow', variant: 'Hitam', home: true, screenshot: 'ulasan-07', highlight: 'kualitas keren',
      text: 'Kejernihan lensa: Bagus Kualitas pengerjaan: Sangat wort it untuk harga segini udah dapet kualitas keren' },
    { rating: 5, name: 'U***j', product: 'IceGlow', variant: 'Ungu Gelap', home: true, screenshot: 'ulasan-08', highlight: 'dingin bet',
      text: 'Mantap collernya dingin bet Performa sistem: Bagus bangetttt' },
    { rating: 5, name: 'S***h', product: 'IceGlow', variant: 'Hitam', home: true, screenshot: 'ulasan-09', highlight: 'GK nyesel',
      text: 'Gacor barang nya GK nyesel deh beli di nexura gacor produk nya' },
    { rating: 5, name: 'M***q', product: 'IceGlow', variant: 'Hitam', home: true, screenshot: 'ulasan-10', highlight: 'produk sesuai deskripsi',
      text: 'Alhamdulillah pesanan yg ditunggu2 akhirnya dateng juga meski lama menunggu...produk sesuai deskripsi' },
    { rating: 5, name: 'Y***n', product: 'YinYang Series', home: true, screenshot: 'ulasan-11', highlight: 'responsif',
      text: 'sistem atau objeknya sangat baik sekali dijempol, sentuhan objekny menyentuh display HP saya sangat pas , nyaman, responsif, pkoknya cobain sendiri aja, nexura bikin kual…' },
    { rating: 5, name: 'H***w', product: 'YinYang Series', home: true, screenshot: 'ulasan-12', highlight: 'Bagus premium bet',
      text: 'Performa sistem: Enak bet pas nyaman Kualitas pengerjaan: Bagus premium bet sesuai sama di live/foto Sumpah nexura klo bkin produk ga pernah gagal design nya mewah,kece,e…' },
    { rating: 5, name: 'N***m', product: 'YinYang Series', home: true, screenshot: 'ulasan-13', highlight: 'bahannya lembut',
      text: 'bahannya lembut nyaman luar dalem untuk di pake jangka panjang ini enak si,apalagi buat main 2-3jam ata 5 jam,jujur kalo kalian ngiranya ini bakal licin buat main game fp…' },
    { rating: 5, name: 'X***a', product: 'YinYang Series', home: true, screenshot: 'ulasan-14', highlight: 'bintang 5',
      text: 'Sarung jempol YINYANG ini bagus bahannya lebih lembut dan juga enak dipakai tidak sesak ke jempol jadi main lebih enak mantap saya kasih bintang 5' },
    { rating: 5, name: 'R***s', product: 'YinYang Series', home: true, screenshot: 'ulasan-15', highlight: 'Sangat makjosss',
      text: 'Performa sistem: Sangan bagus dan licin dan nyaman di pakai enak lagi Kualitas pengerjaan: Sangat makjosss enak banget kalau pakai in ke mana mana pun elegan dan macem ma…' },
    { rating: 5, name: 'D***x', product: 'Vortex', variant: 'Ungu (Violet Purple)', home: true, screenshot: 'ulasan-16', highlight: 'sensinya bagus',
      text: 'Kualitas pengerjaan: Lumayan licin, nyaman di jempol, tekstur nya halus, sensinya bagus, warnanya pas dan cocok buat yang suka warna agak gelap, cocok deh brand NEXURA in…' },
    { rating: 5, name: 'E***r', product: 'Vortex', variant: 'Merah (Crimson Spiral)', home: true, screenshot: 'ulasan-17', highlight: 'bahan tebel',
      text: 'Kualitas sangat bagus, responsif, bahan tebel, enak di pake di jari, bisa buat main game apa aja, dll' },
    { rating: 5, name: 'B***q', product: 'Vortex', variant: 'Merah (Crimson Spiral)', home: true, screenshot: 'ulasan-18', highlight: 'nyaman di jari',
      text: 'Sarung tangan ini sangat enak di pakai dan nyaman di jari, tidak membuat gerah atau gatal, kain nya juga tidak kasar ,harganya juga terjangkau,saya sangat nyaman ketika b…' },
    { rating: 5, name: 'H***v', product: 'Vortex', variant: 'Biru (Blue Pulse)', home: true, screenshot: 'ulasan-19', highlight: 'licin parah',
      text: 'Kualitas pengerjaan: jaitanya rapih kaya ga ada sambungan Performa sistem: licin parah, enak si responsif,tp belum terbiasa aja, biasa pakai merk sebelah, pake merk ini k…' },
    { rating: 5, name: 'T***a', product: 'Vortex', variant: 'Biru (Blue Pulse)', home: true, screenshot: 'ulasan-20', highlight: 'Nyaman licin',
      text: 'Performa sistem: Nyaman licin saat di pakek Kualitas pengerjaan: Bagus rapih Barang mendarat dengan baik kurir ramah langganan barang sesuai iklan sarung jempol nexura se…' },

    // Ulasan lain: hanya tampil di halaman produknya masing-masing.
    { rating: 5, name: 'O***p', product: 'IceGlow', variant: 'Hitam',
      text: 'Pengiriman nya cepet padahal baru kemarin check out besoknya udah sampe lagi,coolernya juga bagus banget dingin sampe case aku berembun pokoknya top markotop' },
    { rating: 5, name: 'Q***m', product: 'YinYang Series',
      text: 'Mantap min! Karena sarung jempol ini bikin Gameplay jadi makin jago ! Karena Bikin tambah Responsif sarung tangan ini Bismillah dapet wdp;)' },
    { rating: 5, name: 'T***m', product: 'Vortex', variant: 'Ungu (Violet Purple)',
      text: 'Mantap min gara gara pake sarjem dari nexura gw jadi MVP, Mantap min meskipun harganya cuma duapuluh an ribu tapi responsif 🔥👑' },
    { rating: 5, name: 'V***e', product: 'Hydrogel Privacy', variant: 'Case Friendly',
      text: 'Sumpah bikin nagih kalau pakai ini. Sambil ngopi, gulir-gulir layar jadi mantap.' },
    { rating: 5, name: 'K***l', product: 'YinYang Series',
      text: 'Produk sesuai. Sarung jempolnya sangat responsif dan bahannya nyaman.' },
    { rating: 5, name: 'Z***z', product: 'Hydrogel Matte', variant: 'Case Friendly',
      text: 'Akhirnya yang ditunggu-tunggu datang juga. Emang sebagus itu sih nih hydrogel, bikin licin dan lincah pas main game. Langsung saja bintang lima.' },
    { rating: 5, name: 'H***j', product: 'IceGlow', variant: 'Hitam',
      text: 'Barang datang sesuai pesanan, tokonya amanah.' },
    { rating: 5, name: 'N***p', product: 'Hydrogel Matte', variant: 'Fullscreen',
      text: 'Sesuai yang diiklankan. Cocok buat yang main game, layar fast respon. Rekomendasi banget.' },
    { rating: 5, name: 'Y***e', product: 'Hydrogel Matte', variant: 'Case Friendly',
      text: 'Bagus, licin, dapat 2 pula. Kekurangan ketutup sama kelebihan. Worth it!!' },
  ],
};
