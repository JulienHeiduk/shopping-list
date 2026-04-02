import { useState, useEffect, useCallback, useRef } from "react";
import { jsPDF } from "jspdf";

const STORAGE_KEY = "shopping-app-data";

const DEFAULT_DATA = {
  recurringItems: [
    { id: "r1", name: "Lait", category: "Produits laitiers", checked: false },
    { id: "r2", name: "Beurre", category: "Produits laitiers", checked: false },
    { id: "r3", name: "Oeufs", category: "Produits laitiers", checked: false },
    { id: "r4", name: "Pain", category: "Boulangerie", checked: false },
    { id: "r5", name: "Bananes", category: "Fruits & Legumes", checked: false },
    { id: "r6", name: "Pommes", category: "Fruits & Legumes", checked: false },
  ],
  menus: [
    {
      id: "m1", name: "Pates Carbonara",
      ingredients: [
        { name: "Spaghetti", category: "Epicerie", qty: "500g" },
        { name: "Lardons", category: "Viande", qty: "200g" },
        { name: "Parmesan", category: "Produits laitiers", qty: "100g" },
        { name: "Oeufs", category: "Produits laitiers", qty: "3" },
        { name: "Creme fraiche", category: "Produits laitiers", qty: "20cl" },
      ],
    },
    {
      id: "m2", name: "Salade Cesar",
      ingredients: [
        { name: "Laitue romaine", category: "Fruits & Legumes", qty: "1" },
        { name: "Poulet", category: "Viande", qty: "200g" },
        { name: "Parmesan", category: "Produits laitiers", qty: "50g" },
        { name: "Croutons", category: "Boulangerie", qty: "100g" },
        { name: "Sauce Cesar", category: "Epicerie", qty: "1" },
      ],
    },
    {
      id: "m3", name: "Ratatouille",
      ingredients: [
        { name: "Courgettes", category: "Fruits & Legumes", qty: "2" },
        { name: "Aubergines", category: "Fruits & Legumes", qty: "2" },
        { name: "Poivrons", category: "Fruits & Legumes", qty: "2" },
        { name: "Tomates", category: "Fruits & Legumes", qty: "4" },
        { name: "Oignons", category: "Fruits & Legumes", qty: "2" },
        { name: "Ail", category: "Fruits & Legumes", qty: "3 gousses" },
        { name: "Huile d'olive", category: "Epicerie", qty: "3 c.s." },
      ],
    },
  ],
  savedLists: [],
  categories: ["Fruits & Legumes", "Produits laitiers", "Viande", "Boulangerie", "Epicerie", "Boissons", "Surgeles", "Hygiene", "Autre"],
};

const CAT_ICONS = { "Fruits & Legumes": "🥕", "Produits laitiers": "🧀", Viande: "🥩", Boulangerie: "🥖", Epicerie: "🫙", Boissons: "🥤", Surgeles: "🧊", Hygiene: "🧴", Autre: "📦" };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ─── DESIGN TOKENS ───
const C = { bg: "#faf7f2", surface: "#ffffff", accent: "#d4622b", accentLight: "#fdf0e8", text: "#2c2416", muted: "#8a7e6e", border: "#e8e2d8", success: "#4a8c5c", shadow: "0 2px 12px rgba(44,36,22,0.06)" };
const F = { display: "'Playfair Display', Georgia, serif", body: "'DM Sans', 'Segoe UI', sans-serif" };

export default function ShoppingApp() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("home");
  const [selectedMenus, setSelectedMenus] = useState([]);
  const [currentList, setCurrentList] = useState(null);
  const [editingMenu, setEditingMenu] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(STORAGE_KEY);
        setData(r?.value ? { ...DEFAULT_DATA, ...JSON.parse(r.value) } : DEFAULT_DATA);
      } catch { setData(DEFAULT_DATA); }
      setLoading(false);
    })();
  }, []);

  const persist = useCallback(async (d) => { setData(d); try { await window.storage.set(STORAGE_KEY, JSON.stringify(d)); } catch {} }, []);

  const generateList = useCallback(() => {
    const items = [], seen = new Set();
    data.recurringItems.filter((r) => r.checked).forEach((ri) => {
      const k = ri.name.toLowerCase();
      if (!seen.has(k)) { seen.add(k); items.push({ id: uid(), name: ri.name, category: ri.category, qty: "", checked: false, source: "recurrent" }); }
    });
    selectedMenus.forEach((mid) => {
      const menu = data.menus.find((m) => m.id === mid);
      if (!menu) return;
      menu.ingredients.forEach((ing) => {
        const k = ing.name.toLowerCase();
        if (!seen.has(k)) { seen.add(k); items.push({ id: uid(), name: ing.name, category: ing.category, qty: ing.qty, checked: false, source: menu.name }); }
        else { const ex = items.find((i) => i.name.toLowerCase() === k); if (ex && ing.qty) { ex.qty = ex.qty ? `${ex.qty} + ${ing.qty}` : ing.qty; } }
      });
    });
    setCurrentList({ id: uid(), name: `Liste du ${new Date().toLocaleDateString("fr-FR")}`, createdAt: new Date().toISOString(), menus: selectedMenus.map((id) => data.menus.find((m) => m.id === id)?.name).filter(Boolean), items });
    setView("list-edit");
  }, [data, selectedMenus]);

  const saveList = useCallback(async () => {
    if (!currentList) return;
    const exists = data.savedLists.find((l) => l.id === currentList.id);
    const newLists = exists ? data.savedLists.map((l) => l.id === currentList.id ? currentList : l) : [currentList, ...data.savedLists];
    await persist({ ...data, savedLists: newLists });
    showToast("Liste sauvegardee !"); setCurrentList(null); setSelectedMenus([]); setView("home");
  }, [currentList, data, persist, showToast]);

  // ═══════════════════ PDF EXPORT (jsPDF) ═══════════════════
  const exportToPdf = useCallback(async (listOverride) => {
    const list = listOverride || currentList;
    if (!list) return;
    showToast("Generation du PDF...");

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210, H = 297, ML = 18, MR = 18, MT = 22;
    const usable = W - ML - MR, colGap = 10;
    const colW = (usable - colGap) / 2;
    let y = MT;

    // ── Title
    doc.setFontSize(22); doc.setFont("helvetica", "bold");
    doc.text(list.name, W / 2, y, { align: "center" }); y += 8;

    // ── Date
    const dateStr = new Date(list.createdAt || Date.now()).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(138, 126, 110);
    doc.text(`${dateStr} - ${list.items.length} article${list.items.length > 1 ? "s" : ""}`, W / 2, y, { align: "center" }); y += 5;

    // ── Orange line
    doc.setDrawColor(212, 98, 43); doc.setLineWidth(0.8);
    doc.line(ML, y, W - MR, y); y += 7;

    // ── Menus
    if (list.menus?.length > 0) {
      doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(212, 98, 43);
      doc.text(`Menus : ${list.menus.join("  |  ")}`, W / 2, y, { align: "center" }); y += 8;
    }
    doc.setTextColor(44, 36, 22);

    // ── Group by category
    const grouped = {};
    list.items.forEach((item) => { if (!grouped[item.category]) grouped[item.category] = []; grouped[item.category].push(item); });
    const catBlocks = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, items]) => ({ cat, items, h: 10 + items.length * 7 }));

    // ── Balance into 2 columns
    const totalH = catBlocks.reduce((s, b) => s + b.h + 5, 0);
    const col1 = [], col2 = []; let h1 = 0;
    for (const b of catBlocks) { if (h1 <= totalH / 2) { col1.push(b); h1 += b.h + 5; } else col2.push(b); }

    const drawCol = (blocks, sx, sy, cw) => {
      let cy = sy;
      for (const block of blocks) {
        if (cy + block.h > H - 22) { doc.addPage(); cy = MT; }
        // Category header
        doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(138, 126, 110);
        doc.text(block.cat.toUpperCase(), sx, cy); cy += 2.5;
        doc.setDrawColor(212, 98, 43); doc.setLineWidth(0.4);
        doc.line(sx, cy, sx + cw, cy); cy += 5;
        // Items
        doc.setFontSize(10.5); doc.setTextColor(44, 36, 22);
        for (const item of block.items) {
          doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.35);
          doc.rect(sx + 0.5, cy - 3.2, 3.5, 3.5); // checkbox
          doc.setFont("helvetica", "normal");
          doc.text(item.name, sx + 7, cy);
          if (item.qty) {
            doc.setFontSize(9); doc.setTextColor(138, 126, 110);
            doc.text(item.qty, sx + cw, cy, { align: "right" });
            doc.setFontSize(10.5); doc.setTextColor(44, 36, 22);
          }
          doc.setDrawColor(230, 225, 218); doc.setLineDashPattern([0.6, 1.4], 0); doc.setLineWidth(0.2);
          doc.line(sx, cy + 2.8, sx + cw, cy + 2.8); doc.setLineDashPattern([], 0);
          cy += 7;
        }
        cy += 5;
      }
    };

    drawCol(col1, ML, y, colW);
    drawCol(col2, ML + colW + colGap, y, colW);

    // ── Footer
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p); doc.setFontSize(7.5); doc.setFont("helvetica", "italic"); doc.setTextColor(200, 200, 200);
      doc.text("MaCourse", W / 2, H - 10, { align: "center" });
      if (pages > 1) doc.text(`${p}/${pages}`, W - MR, H - 10, { align: "right" });
    }

    doc.save(`${list.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`);
    showToast("PDF telecharge !");
  }, [currentList, showToast]);

  if (loading || !data) return (
    <div style={S.loadingScreen}><div style={{ fontSize: 48 }}>🛒</div><p style={{ fontFamily: F.body, color: C.muted, marginTop: 12 }}>Chargement...</p></div>
  );

  // ═══════════════════════ VIEWS ═══════════════════════

  const renderHome = () => (
    <div style={S.page}>
      <header style={{ textAlign: "center", padding: "32px 0 24px" }}>
        <h1 style={S.logo}><span style={{ fontSize: 28 }}>🛒</span> MaCourse</h1>
        <p style={{ fontFamily: F.body, fontSize: 14, color: C.muted, margin: "6px 0 0" }}>Planifie tes repas, genere ta liste</p>
      </header>
      <div style={S.grid}>
        {[
          { icon: "✨", title: "Nouvelle liste", desc: "Selectionne tes menus", go: "generate" },
          { icon: "📋", title: "Mes menus", desc: `${data.menus.length} recettes`, go: "menus" },
          { icon: "🔄", title: "Recurrents", desc: `${data.recurringItems.length} articles`, go: "recurring" },
          { icon: "📚", title: "Historique", desc: `${data.savedLists.length} listes`, go: "history" },
        ].map((c) => (
          <button key={c.go} style={S.card} onClick={() => setView(c.go)}>
            <span style={{ fontSize: 32 }}>{c.icon}</span>
            <span style={{ fontFamily: F.display, fontSize: 16, fontWeight: 700 }}>{c.title}</span>
            <span style={{ fontSize: 12, color: C.muted }}>{c.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderGenerate = () => (
    <div style={S.page}>
      <div style={S.topBar}>
        <button style={S.backBtn} onClick={() => { setView("home"); setSelectedMenus([]); }}>← Retour</button>
        <h2 style={S.pageTitle}>Nouvelle liste</h2>
      </div>
      <section style={{ marginBottom: 28 }}>
        <h3 style={S.sectionTitle}>🔄 Articles recurrents</h3>
        <p style={{ fontSize: 13, color: C.muted, margin: "0 0 12px" }}>Coche ce que tu achetes systematiquement</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {data.recurringItems.map((item) => (
            <button key={item.id} style={{ ...S.chip, ...(item.checked ? S.chipActive : {}) }}
              onClick={() => persist({ ...data, recurringItems: data.recurringItems.map((i) => i.id === item.id ? { ...i, checked: !i.checked } : i) })}>
              {CAT_ICONS[item.category] || "📦"} {item.name}
              {item.checked && <span style={{ fontWeight: 700, fontSize: 12, marginLeft: 4 }}>✓</span>}
            </button>
          ))}
        </div>
      </section>
      <section style={{ marginBottom: 28 }}>
        <h3 style={S.sectionTitle}>🍽️ Selectionne tes menus</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.menus.map((menu) => {
            const sel = selectedMenus.includes(menu.id);
            return (
              <button key={menu.id} style={{ ...S.menuCard, ...(sel ? { borderColor: C.accent, background: C.accentLight } : {}) }}
                onClick={() => setSelectedMenus((p) => sel ? p.filter((id) => id !== menu.id) : [...p, menu.id])}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: F.display, fontSize: 16, fontWeight: 700 }}>{menu.name}</span>
                  {sel && <span style={S.menuCheck}>✓</span>}
                </div>
                <span style={{ fontSize: 13, color: C.muted, marginTop: 4, display: "block" }}>{menu.ingredients.length} ingredients</span>
              </button>
            );
          })}
        </div>
      </section>
      <button style={{ ...S.primaryBtn, opacity: selectedMenus.length === 0 && !data.recurringItems.some((i) => i.checked) ? 0.4 : 1 }}
        disabled={selectedMenus.length === 0 && !data.recurringItems.some((i) => i.checked)} onClick={generateList}>
        Generer la liste ({selectedMenus.length} menu{selectedMenus.length !== 1 ? "s" : ""})
      </button>
    </div>
  );

  const renderListEdit = () => {
    if (!currentList) return null;
    const grouped = {};
    currentList.items.forEach((item) => { if (!grouped[item.category]) grouped[item.category] = []; grouped[item.category].push(item); });
    return (
      <div style={S.page}>
        <div style={S.topBar}>
          <button style={S.backBtn} onClick={() => { setCurrentList(null); setView("generate"); }}>← Retour</button>
          <h2 style={S.pageTitle}>Ma liste</h2>
        </div>
        <input style={S.listNameInput} value={currentList.name} onChange={(e) => setCurrentList({ ...currentList, name: e.target.value })} />
        {currentList.menus.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {currentList.menus.map((m, i) => <span key={i} style={S.menuTag}>{m}</span>)}
          </div>
        )}
        {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: 20 }}>
            <h4 style={{ fontFamily: F.display, fontSize: 15, fontWeight: 700, margin: "0 0 10px", color: C.muted, display: "flex", alignItems: "center", gap: 8 }}>{CAT_ICONS[cat] || "📦"} {cat}</h4>
            {items.map((item) => (
              <div key={item.id} style={{ ...S.listItem, ...(item.checked ? { opacity: 0.5, background: "#f5f3ee" } : {}) }}
                onClick={() => setCurrentList({ ...currentList, items: currentList.items.map((i) => i.id === item.id ? { ...i, checked: !i.checked } : i) })}>
                <span style={{ ...S.cb, ...(item.checked ? { background: C.success, borderColor: C.success, color: "#fff" } : {}) }}>{item.checked ? "✓" : ""}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 15, fontWeight: 500, ...(item.checked ? { textDecoration: "line-through" } : {}) }}>{item.name}</span>
                  {item.qty && <span style={{ display: "block", fontSize: 12, color: C.muted }}>{item.qty}</span>}
                </div>
                <button style={S.rmBtn} onClick={(e) => { e.stopPropagation(); setCurrentList({ ...currentList, items: currentList.items.filter((i) => i.id !== item.id) }); }}>×</button>
              </div>
            ))}
          </div>
        ))}
        <AddItemInline categories={data.categories} onAdd={(item) => setCurrentList({ ...currentList, items: [...currentList.items, { id: uid(), ...item, checked: false, source: "ajoute" }] })} />
        <div style={S.bottomActions}>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ ...S.actionBtn, background: C.success, flex: 2 }} onClick={saveList}>💾 Sauvegarder</button>
            <button style={{ ...S.actionBtn, background: C.accent, flex: 1 }} onClick={() => exportToPdf()}>🖨️ PDF</button>
          </div>
        </div>
      </div>
    );
  };

  const renderMenus = () => (
    <div style={S.page}>
      <div style={S.topBar}>
        <button style={S.backBtn} onClick={() => setView("home")}>← Retour</button>
        <h2 style={S.pageTitle}>Mes menus</h2>
      </div>
      {data.menus.map((menu) => (
        <div key={menu.id} style={S.detailCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, margin: 0 }}>{menu.name}</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={S.iconBtn} onClick={() => { setEditingMenu({ ...menu, ingredients: [...menu.ingredients] }); setView("menu-edit"); }}>✏️</button>
              <button style={S.iconBtn} onClick={async () => { await persist({ ...data, menus: data.menus.filter((m) => m.id !== menu.id) }); showToast("Menu supprime"); }}>🗑️</button>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {menu.ingredients.map((ing, idx) => (
              <span key={idx} style={{ background: "#f5f3ee", borderRadius: 100, padding: "5px 12px", fontSize: 13 }}>
                {CAT_ICONS[ing.category] || "📦"} {ing.name} {ing.qty && <em style={{ color: C.muted, fontStyle: "normal", fontSize: 12 }}>({ing.qty})</em>}
              </span>
            ))}
          </div>
        </div>
      ))}
      <button style={S.addBtn} onClick={() => { setEditingMenu({ id: uid(), name: "", ingredients: [] }); setView("menu-edit"); }}>+ Nouveau menu</button>
    </div>
  );

  const renderMenuEdit = () => {
    if (!editingMenu) return null;
    const isNew = !data.menus.find((m) => m.id === editingMenu.id);
    return (
      <div style={S.page}>
        <div style={S.topBar}>
          <button style={S.backBtn} onClick={() => { setEditingMenu(null); setView("menus"); }}>← Retour</button>
          <h2 style={S.pageTitle}>{isNew ? "Nouveau menu" : "Modifier"}</h2>
        </div>
        <input style={S.input} placeholder="Nom du menu" value={editingMenu.name} onChange={(e) => setEditingMenu({ ...editingMenu, name: e.target.value })} />
        <h4 style={S.sectionTitle}>Ingredients</h4>
        {editingMenu.ingredients.map((ing, idx) => (
          <div key={idx} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
            <input style={{ ...S.input, flex: 2 }} value={ing.name} placeholder="Nom" onChange={(e) => { const u = [...editingMenu.ingredients]; u[idx] = { ...u[idx], name: e.target.value }; setEditingMenu({ ...editingMenu, ingredients: u }); }} />
            <input style={{ ...S.input, flex: 1 }} value={ing.qty} placeholder="Qte" onChange={(e) => { const u = [...editingMenu.ingredients]; u[idx] = { ...u[idx], qty: e.target.value }; setEditingMenu({ ...editingMenu, ingredients: u }); }} />
            <select style={{ ...S.input, flex: 1.5 }} value={ing.category} onChange={(e) => { const u = [...editingMenu.ingredients]; u[idx] = { ...u[idx], category: e.target.value }; setEditingMenu({ ...editingMenu, ingredients: u }); }}>
              {data.categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button style={S.rmBtn} onClick={() => setEditingMenu({ ...editingMenu, ingredients: editingMenu.ingredients.filter((_, i) => i !== idx) })}>×</button>
          </div>
        ))}
        <button style={{ background: "none", border: "none", color: C.accent, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: F.body, padding: "8px 0", marginBottom: 16 }}
          onClick={() => setEditingMenu({ ...editingMenu, ingredients: [...editingMenu.ingredients, { name: "", qty: "", category: data.categories[0] }] })}>+ Ajouter un ingredient</button>
        <button style={{ ...S.actionBtn, background: C.success, width: "100%" }} onClick={async () => {
          if (!editingMenu.name.trim()) return;
          const menus = isNew ? [...data.menus, editingMenu] : data.menus.map((m) => m.id === editingMenu.id ? editingMenu : m);
          await persist({ ...data, menus }); showToast(isNew ? "Menu cree !" : "Menu mis a jour !"); setEditingMenu(null); setView("menus");
        }}>{isNew ? "Creer le menu" : "Sauvegarder"}</button>
      </div>
    );
  };

  const renderRecurring = () => (
    <div style={S.page}>
      <div style={S.topBar}>
        <button style={S.backBtn} onClick={() => setView("home")}>← Retour</button>
        <h2 style={S.pageTitle}>Articles recurrents</h2>
      </div>
      {data.recurringItems.map((item) => (
        <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: C.surface, borderRadius: 12, marginBottom: 8, fontSize: 15, boxShadow: "0 1px 4px rgba(44,36,22,0.04)" }}>
          <span>{CAT_ICONS[item.category] || "📦"} {item.name}</span>
          <span style={{ fontSize: 12, color: C.muted, flex: 1, textAlign: "right", marginRight: 12 }}>{item.category}</span>
          <button style={S.rmBtn} onClick={async () => await persist({ ...data, recurringItems: data.recurringItems.filter((i) => i.id !== item.id) })}>×</button>
        </div>
      ))}
      <AddItemInline categories={data.categories} onAdd={async (item) => { await persist({ ...data, recurringItems: [...data.recurringItems, { id: uid(), ...item, checked: false }] }); showToast("Article ajoute !"); }} />
    </div>
  );

  const renderHistory = () => (
    <div style={S.page}>
      <div style={S.topBar}>
        <button style={S.backBtn} onClick={() => setView("home")}>← Retour</button>
        <h2 style={S.pageTitle}>Historique</h2>
      </div>
      {data.savedLists.length === 0 ? (
        <p style={{ color: C.muted, textAlign: "center", padding: "40px 0", fontSize: 15 }}>Aucune liste sauvegardee.</p>
      ) : data.savedLists.map((list) => (
        <div key={list.id} style={S.detailCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <h4 style={{ fontFamily: F.display, fontSize: 16, fontWeight: 700, margin: 0 }}>{list.name}</h4>
              <span style={{ fontSize: 12, color: C.muted }}>{new Date(list.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={S.iconBtn} onClick={() => exportToPdf(list)} title="PDF">🖨️</button>
              <button style={S.iconBtn} onClick={() => { setCurrentList({ ...list, items: list.items.map((i) => ({ ...i })) }); setView("list-edit"); }}>🔄</button>
              <button style={S.iconBtn} onClick={async () => { await persist({ ...data, savedLists: data.savedLists.filter((l) => l.id !== list.id) }); showToast("Liste supprimee"); }}>🗑️</button>
            </div>
          </div>
          {list.menus?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
              {list.menus.map((m, i) => <span key={i} style={{ ...S.menuTag, fontSize: 11, padding: "2px 10px" }}>{m}</span>)}
            </div>
          )}
          <span style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>{list.items.length} articles</span>
        </div>
      ))}
    </div>
  );

  return (
    <div style={S.app}>
      {view === "home" && renderHome()}
      {view === "generate" && renderGenerate()}
      {view === "list-edit" && renderListEdit()}
      {view === "menus" && renderMenus()}
      {view === "menu-edit" && renderMenuEdit()}
      {view === "recurring" && renderRecurring()}
      {view === "history" && renderHistory()}
      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  );
}

function AddItemInline({ categories, onAdd }) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [cat, setCat] = useState(categories[0]);
  const [open, setOpen] = useState(false);
  if (!open) return <button style={S.addBtn} onClick={() => setOpen(true)}>+ Ajouter un article</button>;
  return (
    <div style={{ background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 16, marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <input style={S.input} placeholder="Nom de l'article" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <div style={{ display: "flex", gap: 8 }}>
        <input style={{ ...S.input, flex: 1 }} placeholder="Quantite" value={qty} onChange={(e) => setQty(e.target.value)} />
        <select style={{ ...S.input, flex: 2 }} value={cat} onChange={(e) => setCat(e.target.value)}>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={{ ...S.actionBtn, background: C.success, flex: 1 }} onClick={() => { if (name.trim()) { onAdd({ name: name.trim(), qty, category: cat }); setName(""); setQty(""); } }}>Ajouter</button>
        <button style={{ ...S.actionBtn, background: C.surface, color: C.muted, border: `1.5px solid ${C.border}`, flex: 1 }} onClick={() => setOpen(false)}>Annuler</button>
      </div>
    </div>
  );
}

// ─── STYLES ───
const S = {
  app: { fontFamily: F.body, background: C.bg, minHeight: "100vh", color: C.text, maxWidth: 480, margin: "0 auto", position: "relative" },
  loadingScreen: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: C.bg },
  page: { padding: "20px 16px 100px" },
  logo: { fontFamily: F.display, fontSize: 32, fontWeight: 700, color: C.text, margin: 0, letterSpacing: -0.5 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  card: { background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 16, padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer", boxShadow: C.shadow, fontFamily: F.body },
  topBar: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20, paddingTop: 8 },
  backBtn: { background: "none", border: "none", fontSize: 15, color: C.accent, cursor: "pointer", fontFamily: F.body, fontWeight: 600 },
  pageTitle: { fontFamily: F.display, fontSize: 22, margin: 0, fontWeight: 700 },
  sectionTitle: { fontFamily: F.display, fontSize: 17, fontWeight: 700, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 8 },
  chip: { background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 100, padding: "8px 16px", fontSize: 14, cursor: "pointer", fontFamily: F.body, display: "flex", alignItems: "center", gap: 6 },
  chipActive: { background: C.accentLight, borderColor: C.accent, color: C.accent, fontWeight: 600 },
  menuCard: { background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 16, cursor: "pointer", textAlign: "left", fontFamily: F.body, boxShadow: C.shadow },
  menuCheck: { background: C.accent, color: "#fff", width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 },
  primaryBtn: { background: C.accent, color: "#fff", border: "none", borderRadius: 14, padding: "16px 24px", fontSize: 16, fontWeight: 700, fontFamily: F.body, cursor: "pointer", width: "100%", marginTop: 16 },
  listNameInput: { fontFamily: F.display, fontSize: 20, fontWeight: 700, border: "none", borderBottom: `2px solid ${C.border}`, background: "transparent", width: "100%", padding: "8px 0", marginBottom: 12, color: C.text, outline: "none" },
  menuTag: { background: C.accentLight, color: C.accent, fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 100 },
  listItem: { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: C.surface, borderRadius: 12, marginBottom: 6, cursor: "pointer", boxShadow: "0 1px 4px rgba(44,36,22,0.04)" },
  cb: { width: 22, height: 22, borderRadius: 6, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 },
  rmBtn: { background: "none", border: "none", fontSize: 20, color: C.muted, cursor: "pointer", padding: "0 4px", lineHeight: 1 },
  bottomActions: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, padding: 16, background: `linear-gradient(transparent, ${C.bg}ee 30%)`, boxSizing: "border-box" },
  actionBtn: { color: "#fff", border: "none", borderRadius: 12, padding: "14px 24px", fontSize: 15, fontWeight: 700, fontFamily: F.body, cursor: "pointer" },
  detailCard: { background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 16, padding: 18, marginBottom: 12, boxShadow: C.shadow },
  iconBtn: { background: "none", border: "none", fontSize: 18, cursor: "pointer", padding: 4 },
  addBtn: { background: C.accentLight, color: C.accent, border: `1.5px dashed ${C.accent}`, borderRadius: 14, padding: 16, fontSize: 15, fontWeight: 700, fontFamily: F.body, cursor: "pointer", width: "100%", marginTop: 12 },
  input: { fontFamily: F.body, fontSize: 14, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", background: C.surface, color: C.text, outline: "none", width: "100%", boxSizing: "border-box", marginBottom: 8 },
  toast: { position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: C.text, color: "#fff", padding: "12px 24px", borderRadius: 100, fontSize: 14, fontWeight: 600, fontFamily: F.body, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", zIndex: 100 },
};
