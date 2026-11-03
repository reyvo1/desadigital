import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  MapPin,
  MessageSquare,
  Minus,
  Plus,
  Receipt,
  Search,
  ShoppingBag,
  ShoppingCart,
  Star,
  Store,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import {
  MarketCollectiveOrder,
  MarketProduct,
  MarketShippingRate,
  VillageSiteConfig,
} from '../types/village';

const FALLBACK_PRODUCT_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><rect width="800" height="500" fill="#064e3b"/><circle cx="650" cy="120" r="70" fill="#fbbf24" fill-opacity="0.7"/><text x="50" y="420" font-family="Arial, sans-serif" font-weight="bold" font-size="28" fill="#ffffff">Produk Unggulan UMKM Desa</text></svg>`
)}`;

interface MarketViewProps {
  products: MarketProduct[];
  siteConfig: VillageSiteConfig;
  onOrderCreated?: (order: MarketCollectiveOrder) => void;
}

interface CartItem {
  product: MarketProduct;
  quantity: number;
}

export const MarketView: React.FC<MarketViewProps> = ({
  products,
  siteConfig,
  onOrderCreated,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitForm, setSubmitForm] = useState({
    name: '',
    category: '',
    price: '',
    unit: '',
    sellerName: '',
    producerName: '',
    dusun: '',
    whatsapp: '',
    stock: '',
    imageUrl: '',
    description: '',
    isOrganic: true,
  });

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/market-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: submitForm.name,
          category: submitForm.category,
          price: Number(submitForm.price),
          unit: submitForm.unit,
          seller_name: submitForm.sellerName,
          producer_name: submitForm.producerName || submitForm.sellerName,
          dusun: submitForm.dusun,
          whatsapp: submitForm.whatsapp,
          stock: Number(submitForm.stock) || 0,
          image_url: submitForm.imageUrl || null,
          description: submitForm.description || null,
          is_organic_or_local: submitForm.isOrganic,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Pengajuan produk terkirim. Admin akan meninjau.');
        setIsSubmitOpen(false);
        setSubmitForm({ name: '', category: '', price: '', unit: '', sellerName: '', producerName: '', dusun: '', whatsapp: '', stock: '', imageUrl: '', description: '', isOrganic: true });
      } else {
        alert(data?.error || 'Gagal mengirim pengajuan.');
      }
    } catch {
      alert('Gagal mengirim pengajuan.');
    } finally {
      setSubmitting(false);
    }
  };

  const shippingRates: MarketShippingRate[] = useMemo(() => {
    if (siteConfig.marketShippingRates && siteConfig.marketShippingRates.length > 0) {
      return siteConfig.marketShippingRates;
    }
    return [
      {
        id: 'ship-bumdes',
        label: 'Ambil Mandiri di Gerai BUMDes / Balai Desa',
        dusunScope: 'Seluruh Dusun (08.00 - 16.00 WIB)',
        costRupiah: 0,
        estimatedTime: 'Siap diambil 1 jam',
      },
      {
        id: 'ship-lokal-1',
        label: 'Kurir Pemuda Desa — Dalam Dusun',
        dusunScope: 'Dusun 1, Dusun 2, Dusun 3',
        costRupiah: 5000,
        estimatedTime: '1 - 2 Jam (Hari Sama)',
      },
      {
        id: 'ship-antar-dusun',
        label: 'Kurir BUMDes — Antar Dusun Se-Desa',
        dusunScope: 'Lintas Dusun Se-Desa',
        costRupiah: 10000,
        estimatedTime: '2 - 4 Jam (Hari Sama)',
      },
    ];
  }, [siteConfig.marketShippingRates]);

  const [selectedShippingId, setSelectedShippingId] = useState<string>(
    shippingRates[0]?.id || 'ship-bumdes'
  );
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerDusun, setBuyerDusun] = useState(
    siteConfig.defaults?.dusun || 'Dusun 1 Sukasari'
  );
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<MarketCollectiveOrder | null>(null);
  const [checkoutError, setCheckoutError] = useState('');

  const categories = useMemo(() => {
    const base =
      siteConfig.marketCategories && siteConfig.marketCategories.length > 0
        ? siteConfig.marketCategories
        : ['Semua', 'Hasil Bumi', 'Kuliner Olahan', 'Kerajinan Tangan', 'Pupuk & Bibit'];
    const dynamic = products.map((p) => p.category).filter(Boolean);
    return Array.from(new Set([...base, ...dynamic]));
  }, [products, siteConfig.marketCategories]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = selectedCategory === 'Semua' || p.category === selectedCategory;
      const seller = p.sellerName || p.producerName || '';
      const matchesSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seller.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.dusun.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);

  const getWhatsAppOrderUrl = (product: MarketProduct) => {
    const seller =
      product.sellerName ||
      product.producerName ||
      siteConfig.defaults?.sellerLabel ||
      'Pelapak UMKM';
    const text = `Halo ${seller}, saya tertarik memesan produk *${product.name}* (${formatRupiah(
      product.price
    )} / ${product.unit}) dari katalog Lapak ${siteConfig.villageName}. Apakah stok masih tersedia? Terima kasih.`;
    const cleanPhone = product.whatsapp.replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  const addToCart = (product: MarketProduct) => {
    setCreatedInvoice(null);
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const totalItemsInCart = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const subtotalAmount = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart]
  );

  const activeShipping = useMemo(
    () =>
      shippingRates.find((r) => r.id === selectedShippingId) ||
      shippingRates[0] || {
        id: 'ship-bumdes',
        label: 'Ambil di BUMDes',
        dusunScope: 'Desa',
        costRupiah: 0,
        estimatedTime: '1 Jam',
      },
    [shippingRates, selectedShippingId]
  );

  const grandTotalAmount = subtotalAmount + (activeShipping?.costRupiah || 0);

  const buildCollectiveWhatsAppUrl = (order: MarketCollectiveOrder) => {
    const lines = order.items.map(
      (it, idx) => {
        const unitPrice = it.unitPrice ?? it.price ?? 0;
        return `${idx + 1}. *${it.productName}* (${it.quantity} x ${formatRupiah(
          unitPrice
        )}) = ${formatRupiah(it.quantity * unitPrice)} [Pelapak: ${it.sellerName}]`;
      }
    );
    const msg = [
      `*PESANAN KOLEKTIF LAPAK UMKM & BUMDES ${siteConfig.villageName.toUpperCase()}*`,
      `Kode Invoice: *${order.orderCode}*`,
      `Nama Pembeli: *${order.buyerName}*`,
      `WhatsApp: ${order.buyerPhone}`,
      `Alamat/Dusun: ${order.buyerDusun}`,
      ``,
      `*Rincian Produk UMKM:*`,
      ...lines,
      ``,
      `Subtotal Produk: ${formatRupiah(order.subtotal)}`,
      `Metode Pengiriman: ${order.shippingMethodLabel} (${formatRupiah(order.shippingCost)})`,
      `*TOTAL PEMBAYARAN: ${formatRupiah(order.totalAmount)}*`,
      order.notes ? `Catatan: ${order.notes}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const cleanWa = (siteConfig.officialWhatsApp || '6281210002026').replace(/\D/g, '');
    return `https://wa.me/${cleanWa}?text=${encodeURIComponent(msg)}`;
  };

  const handleCollectiveCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError('');

    if (cart.length === 0) {
      setCheckoutError('Keranjang belanja masih kosong.');
      return;
    }
    if (!buyerName.trim() || !buyerPhone.trim()) {
      setCheckoutError('Mohon lengkapi Nama Lengkap dan Nomor WhatsApp aktif Anda.');
      return;
    }

    const orderPayload: MarketCollectiveOrder = {
      id: `ord-${Date.now()}`,
      orderCode: `INV-UMKM-2026-${String(
        (siteConfig.marketOrders?.length || 0) + 1
      ).padStart(3, '0')}`,
      buyerName: buyerName.trim(),
      buyerPhone: buyerPhone.trim(),
      buyerDusun: buyerDusun.trim(),
      shippingMethodLabel: activeShipping.label,
      shippingCost: activeShipping.costRupiah ?? activeShipping.cost ?? 0,
      items: cart.map((c) => ({
        productId: c.product.id,
        productName: c.product.name,
        sellerName:
          c.product.sellerName ||
          c.product.producerName ||
          siteConfig.defaults?.sellerLabel ||
          'UMKM Desa',
        sellerWhatsapp: c.product.whatsapp,
        unitPrice: c.product.price,
        quantity: c.quantity,
        unit: c.product.unit,
      })),
      subtotal: subtotalAmount,
      totalAmount: grandTotalAmount,
      notes: orderNotes.trim(),
      status: 'Menunggu Konfirmasi',
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/public/market-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: orderPayload }),
      });
      const data = await res.json();
      const savedOrder: MarketCollectiveOrder = data?.order || orderPayload;
      setCreatedInvoice(savedOrder);
      setCart([]);
      if (onOrderCreated) {
        onOrderCreated(savedOrder);
      }
    } catch {
      setCreatedInvoice(orderPayload);
      setCart([]);
      if (onOrderCreated) {
        onOrderCreated(orderPayload);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">
            <Store className="w-4 h-4" />
            <span>Katalog Ekonomi Kreatif BUMDes & UMKM Warga</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
            Lapak Digital & Produk Unggulan {siteConfig.villageName}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Pilih beberapa produk UMKM sekaligus ke dalam <strong>Keranjang Belanja Kolektif</strong>, hitung ongkir kurir lokal desa atau ambil di Gerai BUMDes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari produk, penjual, atau dusun..."
              aria-label="Cari produk UMKM"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 outline-none pr-9"
            />
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
          </div>

          <button
            type="button"
            onClick={() => setIsSubmitOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold shadow-sm transition cursor-pointer shrink-0"
          >
            Ajukan Produk
          </button>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold shadow-sm transition cursor-pointer shrink-0"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Keranjang Kolektif</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono text-[11px] font-black">
              {totalItemsInCart}
            </span>
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-800 hover:border-emerald-500'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-emerald-50 dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-slate-800">
          <Truck className="w-4 h-4 text-emerald-700" />
          <span>
            Tersedia <strong>{shippingRates.length} opsi pengiriman lokal</strong> & Ambil Gratis di BUMDes
          </span>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => {
          const seller =
            product.sellerName ||
            product.producerName ||
            siteConfig.defaults?.sellerLabel ||
            'UMKM Desa';
          const inCartQty =
            cart.find((item) => item.product.id === product.id)?.quantity || 0;

          return (
            <div
              key={product.id}
              className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition flex flex-col justify-between group"
            >
              <div className="relative aspect-[16/10] bg-emerald-950 overflow-hidden">
                <img
                  src={product.imageUrl || FALLBACK_PRODUCT_SVG}
                  alt={product.name}
                  onError={(e) => {
                    if (e.currentTarget.src !== FALLBACK_PRODUCT_SVG) {
                      e.currentTarget.src = FALLBACK_PRODUCT_SVG;
                    }
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="bg-emerald-900/90 text-emerald-100 text-[11px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-xs">
                    {product.category}
                  </span>
                  {product.isOrganicOrLocal && (
                    <span className="bg-amber-500/95 text-slate-950 text-[10px] font-extrabold px-2 py-1 rounded-lg inline-flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Lokal Asli</span>
                    </span>
                  )}
                </div>
                <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-xs text-amber-300 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center space-x-1 font-mono">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{Number(product.rating || 4.8).toFixed(1)}</span>
                </div>
              </div>

              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <h3 className="font-extrabold text-base text-gray-900 dark:text-white line-clamp-1">
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      Penjual: <strong>{seller}</strong>
                    </span>
                    <span className="inline-flex items-center space-x-1 text-emerald-700 dark:text-emerald-400 font-medium">
                      <MapPin className="w-3 h-3" />
                      <span>{product.dusun}</span>
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-400 block">
                        Harga per {product.unit} • Terjual {product.soldCount || 0}
                      </span>
                      <p className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                        {formatRupiah(product.price)}
                      </p>
                    </div>
                    {inCartQty > 0 && (
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                        Di Keranjang: {inCartQty}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => addToCart(product)}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Keranjang</span>
                    </button>

                    <a
                      href={getWhatsAppOrderUrl(product)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WA Penjual</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800">
          <ShoppingBag className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
            Produk UMKM tidak ditemukan untuk filter pencarian tersebut.
          </p>
        </div>
      )}

      {/* Transparansi Pesanan Kolektif BUMDes Terbaru (Dari Database Server) */}
      {(siteConfig.marketOrders || []).length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-700" />
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Log Transaksi Checkout Kolektif BUMDes & UMKM ({siteConfig.marketOrders?.length} Pesanan)
                </h2>
                <p className="text-xs text-slate-500">
                  Data pesanan kolektif warga tersimpan secara dinamis di database server desa
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(siteConfig.marketOrders || []).slice(0, 4).map((ord) => (
              <div
                key={ord.id}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    {ord.orderCode}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    {ord.status}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    Pembeli: {ord.buyerName} ({ord.buyerDusun})
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">
                    {ord.items.map((i) => `${i.productName} (${i.quantity}x)`).join(', ')}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-slate-700 text-[11px]">
                  <span className="text-slate-500">{ord.shippingMethodLabel}</span>
                  <span className="font-mono font-extrabold text-slate-900 dark:text-white">
                    Total: {formatRupiah(ord.totalAmount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Cart Bar when cart has items */}
      {totalItemsInCart > 0 && !isCartOpen && (
        <div className="fixed bottom-5 right-20 z-30 bg-emerald-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-emerald-400/40 flex items-center gap-4">
          <div>
            <span className="text-[11px] text-emerald-200 block font-semibold">
              Keranjang Belanja Kolektif ({totalItemsInCart} Produk)
            </span>
            <span className="text-sm font-extrabold font-mono text-amber-300">
              Subtotal: {formatRupiah(subtotalAmount)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold transition cursor-pointer"
          >
            Checkout Kolektif
          </button>
        </div>
      )}

      {/* Modal Keranjang Belanja & Checkout Kolektif */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full overflow-hidden my-8">
            <div className="bg-emerald-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="w-5 h-5 text-amber-300" />
                <div>
                  <h2 className="text-base font-extrabold">
                    Keranjang Belanja & Checkout Kolektif Pasar UMKM
                  </h2>
                  <p className="text-[11px] text-emerald-200">
                    Gabungkan produk dari beberapa warga pelapak dalam satu pengiriman BUMDes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {createdInvoice ? (
                <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                        TERSIMPAN DI SERVER DATABASE DESA
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900">
                        Invoice Kolektif: {createdInvoice.orderCode}
                      </h3>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-emerald-200 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Nama Pembeli:</span>
                      <span className="font-bold text-slate-900">{createdInvoice.buyerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Alamat / Dusun:</span>
                      <span className="font-semibold text-slate-800">{createdInvoice.buyerDusun}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Metode Pengiriman:</span>
                      <span className="font-semibold text-emerald-800">
                        {createdInvoice.shippingMethodLabel} ({formatRupiah(createdInvoice.shippingCost)})
                      </span>
                    </div>
                    <div className="border-t border-slate-100 pt-2 space-y-1">
                      {createdInvoice.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-slate-700">
                          <span>
                            {item.quantity}x {item.productName} ({item.sellerName})
                          </span>
                          <span className="font-mono font-semibold">
                            {formatRupiah((item.unitPrice ?? item.price ?? 0) * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-extrabold text-emerald-900">
                      <span>Total Pembayaran Kolektif:</span>
                      <span className="font-mono">{formatRupiah(createdInvoice.totalAmount)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <a
                      href={buildCollectiveWhatsAppUrl(createdInvoice)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Kirim Rincian Pesanan ke WhatsApp BUMDes
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setCreatedInvoice(null);
                        setIsCartOpen(false);
                      }}
                      className="py-3 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold"
                    >
                      Selesai
                    </button>
                  </div>
                </div>
              ) : cart.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <ShoppingBag className="w-10 h-10 text-slate-400 mx-auto" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Keranjang Belanja Kolektif Masih Kosong
                  </p>
                  <p className="text-xs text-slate-500">
                    Klik tombol <strong>+ Keranjang</strong> pada beberapa produk UMKM untuk menggabungkan pesanan.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleCollectiveCheckout} className="space-y-5">
                  {/* Daftar Item di Keranjang */}
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Daftar Produk yang Dipilih ({totalItemsInCart} Item)
                    </h3>
                    {cart.map(({ product, quantity }) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                            {product.name}
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            {formatRupiah(product.price)} / {product.unit} • Pelapak:{' '}
                            {product.sellerName || product.producerName}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(product.id, -1)}
                            className="w-7 h-7 rounded-lg bg-white border border-slate-300 flex items-center justify-center hover:bg-slate-100"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-mono font-bold w-6 text-center">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(product.id, 1)}
                            className="w-7 h-7 rounded-lg bg-white border border-slate-300 flex items-center justify-center hover:bg-slate-100"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(product.id, -quantity)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg ml-1"
                            title="Hapus produk"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pilihan Estimasi Ongkir Lokal / Ambil di BUMDes */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Pilih Metode Pengiriman Lokal / Ambil di BUMDes
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {shippingRates.map((rate) => (
                        <button
                          key={rate.id}
                          type="button"
                          onClick={() => setSelectedShippingId(rate.id)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            selectedShippingId === rate.id
                              ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500/30'
                              : 'bg-white border-slate-200 hover:border-emerald-400'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-slate-900">
                              {rate.label}
                            </span>
                            <span className="text-xs font-mono font-bold text-emerald-700">
                              {(rate.costRupiah ?? rate.cost ?? 0) === 0
                                ? 'GRATIS'
                                : formatRupiah(rate.costRupiah ?? rate.cost ?? 0)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            {rate.dusunScope} • Estimasi: {rate.estimatedTime}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Identitas Pembeli */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nama Lengkap Pembeli *
                      </label>
                      <input
                        type="text"
                        required
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        placeholder="Contoh: Budi Santoso"
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nomor WhatsApp Aktif *
                      </label>
                      <input
                        type="text"
                        required
                        value={buyerPhone}
                        onChange={(e) => setBuyerPhone(e.target.value)}
                        placeholder="Contoh: 081287654321"
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Dusun / Alamat Pengiriman Lengkap
                      </label>
                      <input
                        type="text"
                        value={buyerDusun}
                        onChange={(e) => setBuyerDusun(e.target.value)}
                        placeholder="Contoh: Dusun 1 Sukasari RT 001/RW 001 No. 14"
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Catatan Pesanan (Opsional)
                      </label>
                      <input
                        type="text"
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        placeholder="Contoh: Tolong dikemas rapi untuk oleh-oleh"
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>

                  {/* Ringkasan Biaya */}
                  <div className="bg-slate-900 text-white rounded-xl p-4 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Subtotal Produk ({totalItemsInCart} item)</span>
                      <span className="font-mono">{formatRupiah(subtotalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Ongkos Kirim ({activeShipping.label})</span>
                      <span className="font-mono">
                        {(activeShipping.costRupiah ?? activeShipping.cost ?? 0) === 0
                          ? 'Rp 0 (Ambil di BUMDes)'
                          : formatRupiah(activeShipping.costRupiah ?? activeShipping.cost ?? 0)}
                      </span>
                    </div>
                    <div className="border-t border-slate-700 pt-2 flex justify-between text-sm font-extrabold text-amber-300">
                      <span>Total Checkout Kolektif</span>
                      <span className="font-mono">{formatRupiah(grandTotalAmount)}</span>
                    </div>
                  </div>

                  {checkoutError && (
                    <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                      {checkoutError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold shadow-md transition cursor-pointer"
                  >
                    {isSubmitting
                      ? 'Menyimpan Pesanan ke Server Desa...'
                      : 'Proses Checkout Kolektif & Buat Invoice BUMDes'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
      {isSubmitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white">Ajukan Produk Lapak</h3>
              <button onClick={() => setIsSubmitOpen(false)} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmitProduct} className="space-y-2">
              <input placeholder="Nama Produk" value={submitForm.name} onChange={(e) => setSubmitForm({ ...submitForm, name: e.target.value })} className="w-full px-3 py-2 rounded-xl border text-xs" required />
              <input placeholder="Kategori" value={submitForm.category} onChange={(e) => setSubmitForm({ ...submitForm, category: e.target.value })} className="w-full px-3 py-2 rounded-xl border text-xs" required />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="Harga" value={submitForm.price} onChange={(e) => setSubmitForm({ ...submitForm, price: e.target.value })} className="w-full px-3 py-2 rounded-xl border text-xs" required />
                <input placeholder="Satuan (kg/ikat)" value={submitForm.unit} onChange={(e) => setSubmitForm({ ...submitForm, unit: e.target.value })} className="w-full px-3 py-2 rounded-xl border text-xs" required />
              </div>
              <input placeholder="Nama Penjual" value={submitForm.sellerName} onChange={(e) => setSubmitForm({ ...submitForm, sellerName: e.target.value })} className="w-full px-3 py-2 rounded-xl border text-xs" required />
              <input placeholder="Dusun" value={submitForm.dusun} onChange={(e) => setSubmitForm({ ...submitForm, dusun: e.target.value })} className="w-full px-3 py-2 rounded-xl border text-xs" required />
              <input placeholder="WhatsApp" value={submitForm.whatsapp} onChange={(e) => setSubmitForm({ ...submitForm, whatsapp: e.target.value })} className="w-full px-3 py-2 rounded-xl border text-xs" required />
              <input type="number" placeholder="Stok" value={submitForm.stock} onChange={(e) => setSubmitForm({ ...submitForm, stock: e.target.value })} className="w-full px-3 py-2 rounded-xl border text-xs" />
              <input placeholder="URL Gambar (opsional)" value={submitForm.imageUrl} onChange={(e) => setSubmitForm({ ...submitForm, imageUrl: e.target.value })} className="w-full px-3 py-2 rounded-xl border text-xs" />
              <textarea placeholder="Deskripsi" value={submitForm.description} onChange={(e) => setSubmitForm({ ...submitForm, description: e.target.value })} className="w-full px-3 py-2 rounded-xl border text-xs" rows={2} />
              <label className="flex items-center space-x-2 text-xs">
                <input type="checkbox" checked={submitForm.isOrganic} onChange={(e) => setSubmitForm({ ...submitForm, isOrganic: e.target.checked })} />
                <span>Produk lokal/organik</span>
              </label>
              <button type="submit" disabled={submitting} className="w-full px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center space-x-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>{submitting ? 'Mengirim...' : 'Kirim Pengajuan'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
