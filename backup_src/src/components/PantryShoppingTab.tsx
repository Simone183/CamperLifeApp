import React from 'react';
import { 
  ShoppingBag, 
  ChefHat, 
  CheckSquare, 
  Square, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Info, 
  CheckCircle, 
  Utensils, 
  ArrowRight,
  Flame,
  Droplet,
  PlusCircle,
  TrendingDown,
  Sparkles,
  Search,
  Check
} from 'lucide-react';

interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: 'freschi' | 'secche' | 'scatolame' | 'spezie' | 'bevande';
  daysToExpiry?: number;
  isLow: boolean;
}

interface Recipe {
  id: string;
  title: string;
  durationMin: number;
  difficulty: 'Facile' | 'Media';
  gasUsage: 'Basso' | 'Medio'; // Key camper constraint
  waterUsage: 'Minimo' | 'Poco' | 'Normale'; // Key camper constraint
  potsNeeded: number; // Fewer pots means easier washing
  ingredientsNeeded: { name: string; qtyStr: string; pantryMatchId?: string }[];
  instructions: string[];
}

const DEFAULT_PANTRY: PantryItem[] = [
  { id: 'p1', name: 'Pasta Corta (Penne/Fusilli)', quantity: 1000, unit: 'g', category: 'secche', isLow: false },
  { id: 'p2', name: 'Passata di Pomodoro in brik', quantity: 2, unit: 'pacco', category: 'scatolame', isLow: false },
  { id: 'p3', name: 'Olio Extra Vergine d\'Oliva', quantity: 750, unit: 'ml', category: 'spezie', isLow: false },
  { id: 'p4', name: 'Coccole di Tonno all\'olio d\'oliva', quantity: 3, unit: 'lattina', category: 'scatolame', isLow: false },
  { id: 'p5', name: 'Parmigiano Reggiano Grattugiato', quantity: 150, unit: 'g', category: 'freschi', isLow: true },
  { id: 'p6', name: 'Uova Fresche', quantity: 0, unit: 'pz', category: 'freschi', isLow: true },
  { id: 'p7', name: 'Caffè in Polvere per Moka', quantity: 250, unit: 'g', category: 'secche', isLow: false },
  { id: 'p8', name: 'Latte a lunga conservazione (UHT)', quantity: 1, unit: 'litro', category: 'bevande', isLow: false },
  { id: 'p9', name: 'Pane in cassetta (Bauletto)', quantity: 1, unit: 'confezione', category: 'freschi', isLow: false },
  { id: 'p10', name: 'Sale, Pepe & Spezie Miste', quantity: 1, unit: 'set', category: 'spezie', isLow: false },
  { id: 'p11', name: 'Fagioli Canellini in scatola', quantity: 2, unit: 'lattina', category: 'scatolame', isLow: false },
];

const CAMPER_RECIPES: Recipe[] = [
  {
    id: 'r1',
    title: 'Pasta del Camperista (Tonno e Limone sfumato)',
    durationMin: 12,
    difficulty: 'Facile',
    gasUsage: 'Basso',
    waterUsage: 'Poco',
    potsNeeded: 1,
    ingredientsNeeded: [
      { name: 'Pasta Corta (Penne/Fusilli)', qtyStr: '320g', pantryMatchId: 'p1' },
      { name: 'Coccole di Tonno all\'olio d\'oliva', qtyStr: '2 lattine', pantryMatchId: 'p4' },
      { name: 'Olio Extra Vergine d\'Oliva', qtyStr: '2 cucchiai', pantryMatchId: 'p3' },
      { name: 'Limone fresco (Buccia e Succo)', qtyStr: '1 pz' },
      { name: 'Sale, Pepe & Spezie Miste', qtyStr: 'q.b.', pantryMatchId: 'p10' }
    ],
    instructions: [
      'Lessa la pasta in poca acqua (puoi usare la tecnica risottata per sprecare ancora meno acqua!).',
      'Nel frattempo scola parzialmente il tonno e adagialo direttamente in ciotola con olio e scorza di limone grattugiata.',
      'Scola la pasta direttamente nella ciotola del condimento senza risciacquare per non sprecare calore e acqua indotta.',
      'Mescola energicamente e spremi un goccio di succo di limone fresco prima di servire.'
    ]
  },
  {
    id: 'r2',
    title: 'Caciotta Express & Crostoni al Fagiolo',
    durationMin: 8,
    difficulty: 'Facile',
    gasUsage: 'Basso',
    waterUsage: 'Minimo',
    potsNeeded: 1,
    ingredientsNeeded: [
      { name: 'Pane in cassetta (Bauletto)', qtyStr: '4 fette', pantryMatchId: 'p9' },
      { name: 'Fagioli Canellini in scatola', qtyStr: '1 lattina', pantryMatchId: 'p11' },
      { name: 'Parmigiano Reggiano Grattugiato', qtyStr: '50g', pantryMatchId: 'p5' },
      { name: 'Olio Extra Vergine d\'Oliva', qtyStr: 'q.b.', pantryMatchId: 'p3' },
      { name: 'Sale, Pepe & Spezie Miste', qtyStr: 'q.b.', pantryMatchId: 'p10' }
    ],
    instructions: [
      'Tosta le fette di pane direttamente in padella antiaderente con un filo d\'olio.',
      'Scola i fagioli conservando l\'acqua per altre ricette o sciacquali leggermente (consumo idrico minimo).',
      'Scalda i fagioli nella stessa padella schiacciandoli grossolanamente con una forchetta per formare una crema.',
      'Spalma la crema di fagioli caldi sui crostoni tostati e spolvera con scaglie di parmigiano e pepe nero.'
    ]
  },
  {
    id: 'r3',
    title: 'One-Pot Pasta al Pomodoro e Basilico',
    durationMin: 15,
    difficulty: 'Facile',
    gasUsage: 'Medio',
    waterUsage: 'Poco',
    potsNeeded: 1,
    ingredientsNeeded: [
      { name: 'Pasta Corta (Penne/Fusilli)', qtyStr: '300g', pantryMatchId: 'p1' },
      { name: 'Passata di Pomodoro in brik', qtyStr: '1 pacco', pantryMatchId: 'p2' },
      { name: 'Olio Extra Vergine d\'Oliva', qtyStr: '2 cucchiai', pantryMatchId: 'p3' },
      { name: 'Parmigiano Reggiano Grattugiato', qtyStr: '40g', pantryMatchId: 'p5' },
      { name: 'Aglio o spezie liofilizzate', qtyStr: 'q.b.', pantryMatchId: 'p10' }
    ],
    instructions: [
      'Aggiungi nella pentola contemporaneamente: la pasta cruda, la passata di pomodoro, l\'olio, le spezie e acqua calda sufficiente appena a coprire la pasta.',
      'Accendi il fuoco medio e cuoci mescolando spesso affinché l\'amido della pasta crei una salsa vellutata naturale.',
      'Questo metodo One-Pot dimezza l\'uso del gas e assorbe tutta l\'acqua senza costringerti a scolare l\'acqua calda nel serbatoio delle acque grigie (evitando cattivi odori!).'
    ]
  },
  {
    id: 'r4',
    title: 'Mug Cake alla Moka della Buonanotte',
    durationMin: 5,
    difficulty: 'Facile',
    gasUsage: 'Basso',
    waterUsage: 'Minimo',
    potsNeeded: 0,
    ingredientsNeeded: [
      { name: 'Latte a lunga conservazione (UHT)', qtyStr: '5 cucchiai', pantryMatchId: 'p8' },
      { name: 'Farina comune d\'orzo o frumento', qtyStr: '4 cucchiai' },
      { name: 'Caffè in Polvere per Moka', qtyStr: '1 cucchiaino', pantryMatchId: 'p7' },
      { name: 'Zucchero o dolcificante', qtyStr: '2 cucchiai' }
    ],
    instructions: [
      'Mescola i secchi direttamente in una tazza (Mug) resistente al calore.',
      'Aggiungi il latte mescolando con una forchetta fino ad ottenere una pastella densa.',
      'Cuoci nel microonde a bordo del camper (se munito di inverter da sosta) o a bagnomaria in una pentola coperta per 4-5 minuti sul fuoco basso.'
    ]
  }
];

interface ShoppingItem {
  id: string;
  name: string;
  quantityStr: string;
  category: string;
  isCompleted: boolean;
  isAutoGenerated?: boolean;
}

export function PantryShoppingTab() {
  // Navigation tabs interior: Cambusa vs Ricette vs Lista Spesa
  const [activeSubTab, setActiveSubTab] = React.useState<'pantry' | 'recipes' | 'shopping'>('pantry');

  // Pantry State
  const [pantry, setPantry] = React.useState<PantryItem[]>(() => {
    const saved = localStorage.getItem('camper_pantry_inventory');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return DEFAULT_PANTRY; }
    }
    return DEFAULT_PANTRY;
  });

  // Shopping List State
  const [shoppingList, setShoppingList] = React.useState<ShoppingItem[]>(() => {
    const saved = localStorage.getItem('camper_shopping_list');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    // Pre-populate with items that are flagged as Low stock in pantry
    return DEFAULT_PANTRY.filter(p => p.isLow || p.quantity === 0).map(p => ({
      id: `shop_${p.id}`,
      name: p.name,
      quantityStr: p.unit === 'pz' ? '6 pz' : `1 ${p.unit === 'g' ? 'confezione' : p.unit}`,
      category: p.category,
      isCompleted: false,
      isAutoGenerated: true
    }));
  });

  // Search filter
  const [searchTerm, setSearchTerm] = React.useState('');

  // Add Item to Pantry State Form
  const [showAddPantry, setShowAddPantry] = React.useState(false);
  const [pantryName, setPantryName] = React.useState('');
  const [pantryQty, setPantryQty] = React.useState<number>(1);
  const [pantryUnit, setPantryUnit] = React.useState('lattina');
  const [pantryCat, setPantryCat] = React.useState<PantryItem['category']>('scatolame');

  // Add Item to Shopping list State Form
  const [shopName, setShopName] = React.useState('');
  const [shopQtyStr, setShopQtyStr] = React.useState('1 pz');
  const [shopCat, setShopCat] = React.useState('generico');

  // Sync back to localstorage
  React.useEffect(() => {
    localStorage.setItem('camper_pantry_inventory', JSON.stringify(pantry));
  }, [pantry]);

  React.useEffect(() => {
    localStorage.setItem('camper_shopping_list', JSON.stringify(shoppingList));
  }, [shoppingList]);

  // Pantry Handlers
  const handlePantryQtyChange = (id: string, delta: number) => {
    setPantry(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        const isNowLow = newQty <= (item.unit === 'g' ? 150 : 1);
        return { ...item, quantity: newQty, isLow: isNowLow };
      }
      return item;
    }));
  };

  const handleToggleLow = (id: string) => {
    setPantry(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, isLow: !item.isLow };
      }
      return item;
    }));
  };

  const handleDeletePantryItem = (id: string) => {
    setPantry(prev => prev.filter(item => item.id !== id));
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: '🗑️ Ingrediente rimosso dalla cambusa.' }
    }));
  };

  const handleAddPantryItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pantryName.trim() || pantryQty < 0) return;

    const newItem: PantryItem = {
      id: `pantry_${Date.now()}`,
      name: pantryName.trim(),
      quantity: pantryQty,
      unit: pantryUnit,
      category: pantryCat,
      isLow: pantryQty <= (pantryUnit === 'g' ? 150 : 1)
    };

    setPantry(prev => [...prev, newItem]);
    setPantryName('');
    setPantryQty(1);
    setShowAddPantry(false);
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: `🥫 Aggiunto in cambusa: ${newItem.name}` }
    }));
  };

  // Recipe actions: Auto add missing ingredients to shopping list
  const addRecipeIngredientsToShoppingList = (recipe: Recipe) => {
    let addedCount = 0;
    const newItems: ShoppingItem[] = [];

    recipe.ingredientsNeeded.forEach(ing => {
      // First, check if we have this item in our pantry and if it is sufficient
      let isMissing = false;
      
      if (ing.pantryMatchId) {
        const pantryMatch = pantry.find(p => p.id === ing.pantryMatchId);
        if (!pantryMatch || pantryMatch.quantity <= 0 || pantryMatch.isLow) {
          isMissing = true;
        }
      } else {
        // Semantic check by matching substrings in names
        const substringMatch = pantry.find(p => p.name.toLowerCase().includes(ing.name.toLowerCase()) || ing.name.toLowerCase().includes(p.name.toLowerCase()));
        if (!substringMatch || substringMatch.quantity <= 0) {
          isMissing = true;
        }
      }

      // Check if already present on shopping list
      const alreadyOnShoppingList = shoppingList.find(s => s.name.toLowerCase().includes(ing.name.toLowerCase()));

      if (isMissing && !alreadyOnShoppingList) {
        newItems.push({
          id: `shop_recipe_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: ing.name,
          quantityStr: ing.qtyStr,
          category: 'ricetta',
          isCompleted: false,
          isAutoGenerated: true
        });
        addedCount++;
      }
    });

    if (newItems.length > 0) {
      setShoppingList(prev => [...prev, ...newItems]);
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: `🛒 Aggiunti ${addedCount} ingredienti mancanti alla lista spesa!` }
      }));
    } else {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: `✓ Possiedi già tutti gli ingredienti di questa ricetta in cambusa!` }
      }));
    }
  };

  // Grocery shopping handers
  const handleToggleShopCompleted = (id: string) => {
    setShoppingList(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, isCompleted: !item.isCompleted };
      }
      return item;
    }));
  };

  const handleAddShoppingItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) return;

    const newItem: ShoppingItem = {
      id: `shop_${Date.now()}`,
      name: shopName.trim(),
      quantityStr: shopQtyStr.trim() || '1 pz',
      category: shopCat,
      isCompleted: false
    };

    setShoppingList(prev => [newItem, ...prev]);
    setShopName('');
    setShopQtyStr('1 pz');
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: `🛒 Inserito nella lista spesa: ${newItem.name}` }
    }));
  };

  const handleClearCompletedShop = () => {
    setShoppingList(prev => prev.filter(item => !item.isCompleted));
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: '🧹 Pulite le voci completate dalla lista!' }
    }));
  };

  const handleResetPantryToDefault = () => {
    if (confirm('Ripristinare l’inventario di cambusa standard? Questo cancellerà le tue modifiche.')) {
      setPantry(DEFAULT_PANTRY);
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message: '🔄 Cambusa ripristinata alla scorta standard.' }
      }));
    }
  };

  // Automatically moving completed shopping items to the active pantry stock!
  const handleImportCompletedToPantry = () => {
    const completedItems = shoppingList.filter(s => s.isCompleted);
    if (completedItems.length === 0) {
      alert('Non ci sono prodotti spuntati da trasferire.');
      return;
    }

    let importedCount = 0;
    setPantry(prev => {
      const updatedPantry = [...prev];
      completedItems.forEach(shopItem => {
        // Search if we already have it in the pantry by matching substrings
        const matchingIndex = updatedPantry.findIndex(p => p.name.toLowerCase() === shopItem.name.toLowerCase() || shopItem.name.toLowerCase().includes(p.name.toLowerCase()));
        
        if (matchingIndex !== -1) {
          // Exists, let's replenish it
          const existing = updatedPantry[matchingIndex];
          // Try to guess a safe replenished quantity
          const replenishAmount = existing.unit === 'g' ? 500 : 2;
          updatedPantry[matchingIndex] = {
            ...existing,
            quantity: existing.quantity + replenishAmount,
            isLow: false
          };
        } else {
          // Create new pantry item
          updatedPantry.push({
            id: `pantry_imported_${Date.now()}_${importedCount}`,
            name: shopItem.name,
            quantity: 1,
            unit: 'confezione',
            category: 'secche',
            isLow: false
          });
        }
        importedCount++;
      });
      return updatedPantry;
    });

    // Clean these from shopping list now
    setShoppingList(prev => prev.filter(s => !s.isCompleted));
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: `📥 Trasferiti ${importedCount} prodotti spuntati direttamente nelle scorte della Cambusa!` }
    }));
  };

  // Filter items based on search phrase
  const filteredPantry = pantry.filter(item => {
    return item.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div id="pantry-shopping-container" className="space-y-6 font-sans">
      
      {/* Tab Visual Header */}
      <div className="bg-gradient-to-br from-[#3E4A35] to-[#2B3523] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-black tracking-widest bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-2.5 py-1 rounded-full inline-block">
              Provviste & Cucina Outdoor
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-yellow-300" />
              Gestione Cambusa & Spesa Intelligente
            </h2>
            <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
              Tieni sotto controllo i viveri stipati negli armadietti del camper, consulta ricette veloci calcolate su bassi consumi di gas e acqua potabile, e genera liste spesa dinamiche con reintegro automatico.
            </p>
          </div>

          <button
            onClick={handleResetPantryToDefault}
            className="px-3 py-1.5 bg-[#A45C40] hover:bg-[#8D4A30] active:scale-95 text-white text-xs font-black rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5 uppercase tracking-wider shrink-0"
            title="Ripristina scorta iniziale"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Scorte</span>
          </button>
        </div>

        {/* Interior Navigation Tabs Row */}
        <div className="flex border-b border-white/10 mt-6 gap-1 relative z-10">
          <button
            id="pantry-tab-btn"
            onClick={() => setActiveSubTab('pantry')}
            className={`px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'pantry' 
                ? 'border-yellow-400 text-yellow-300 bg-white/10 dark:bg-black/20' 
                : 'border-transparent text-stone-200 hover:text-white hover:bg-white/10 dark:hover:bg-black/10'
            }`}
          >
            <Utensils className="w-3 h-3 shrink-0" />
            <span>La mia Cambusa ({pantry.length})</span>
          </button>

          <button
            id="recipes-tab-btn"
            onClick={() => setActiveSubTab('recipes')}
            className={`px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'recipes' 
                ? 'border-yellow-400 text-yellow-300 bg-white/10 dark:bg-black/20' 
                : 'border-transparent text-stone-200 hover:text-white hover:bg-white/10 dark:hover:bg-black/10'
            }`}
          >
            <ChefHat className="w-3 h-3 shrink-0" />
            <span>Ricette Salva-Risorse</span>
          </button>

          <button
            id="shopping-tab-btn"
            onClick={() => setActiveSubTab('shopping')}
            className={`px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'shopping' 
                ? 'border-yellow-400 text-yellow-300 bg-white/10 dark:bg-black/20' 
                : 'border-transparent text-stone-200 hover:text-white hover:bg-white/10 dark:hover:bg-black/10'
            }`}
          >
            <ShoppingBag className="w-3 h-3 shrink-0" />
            <span>Lista Spesa ({shoppingList.length})</span>
            {shoppingList.filter(s => s.isCompleted).length > 0 && (
              <span className="bg-emerald-500 text-white font-mono rounded-full text-[9px] w-4 h-4 flex items-center justify-center animate-pulse">
                {shoppingList.filter(s => s.isCompleted).length}
              </span>
            )}
          </button>
        </div>

      </div>

      {/* Main Inner Screens based on active inner Tab */}
      <div className="grid grid-cols-1 gap-6">

        {/* SCREEN A: MY PANTRY */}
        {activeSubTab === 'pantry' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Box: Pantry Inventory (8/12) */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                <div>
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Inventario Viveri & Scatolame</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Incrementa quando fai rifornimento, premi sul tag per alert di spesa immediato</p>
                </div>

                {/* Sub-search filter */}
                <div className="relative max-w-xs w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cerca ingrediente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs text-[#2D2926] bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:outline-none focus:border-[#3E4A35]"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600">×</button>
                  )}
                </div>
              </div>

              {/* Grid of CATEGORIES */}
              <div className="space-y-6">
                {(['freschi', 'secche', 'scatolame', 'bevande', 'spezie'] as const).map(cat => {
                  const catItems = filteredPantry.filter(item => item.category === cat);
                  if (catItems.length === 0) return null;

                  let catLabel = 'Viveri Secchi / Pasta';
                  let catColors = 'text-amber-850 bg-amber-50 border-amber-100';
                  
                  if (cat === 'freschi') {
                    catLabel = 'Freschi & Frigorifero';
                    catColors = 'text-emerald-800 bg-emerald-50 border-emerald-100';
                  } else if (cat === 'scatolame') {
                    catLabel = 'Conserve & Scatolame di Scorta';
                    catColors = 'text-indigo-800 bg-indigo-50 border-indigo-100';
                  } else if (cat === 'bevande') {
                    catLabel = 'Acqua & Bevande di bordo';
                    catColors = 'text-blue-800 bg-blue-50 border-blue-100';
                  } else if (cat === 'spezie') {
                    catLabel = 'Condimenti, Spezie & Olio';
                    catColors = 'text-stone-850 bg-stone-50 border-stone-200/70';
                  }

                  return (
                    <div key={cat} className="space-y-1.5 pb-2">
                      <div className={`p-2 rounded-xl border text-[10px] font-black uppercase tracking-wider flex justify-between items-center ${catColors} dark:border-slate-700 dark:bg-slate-900`}>
                        <span className="dark:text-slate-100">{catLabel}</span>
                        <span className="font-mono text-[9px] dark:text-slate-400">{catItems.length} prodotti</span>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {catItems.map(item => (
                          <div key={item.id} className="py-2.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            
                            {/* Product Name */}
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-extrabold text-[#2D2926] dark:text-slate-100 text-xs leading-snug truncate">
                                  {item.name}
                                </h4>
                                {item.isLow && (
                                  <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded text-[8px] font-black uppercase animate-pulse">
                                    In Esaurimento! 🚨
                                  </span>
                                )}
                                {item.quantity === 0 && (
                                  <span className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-700 text-slate-500 dark:text-slate-400 rounded text-[8px] font-black uppercase">
                                    Finito ✖
                                  </span>
                                )}
                              </div>
                              
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-2">
                                <span>Giacenza attuale: <b>{item.quantity} {item.unit}</b></span>
                                <span>•</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleLow(item.id)}
                                  className={`text-[9px] font-bold underline cursor-pointer hover:text-[#A45C40] dark:hover:text-orange-400`}
                                >
                                  {item.isLow ? 'Segnala come OK' : 'Forza Alert Spesa'}
                                </button>
                              </p>
                            </div>

                            {/* Quantity Controls */}
                            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end shrink-0 border-t border-dashed border-stone-150 dark:border-slate-700 pt-2 sm:pt-0 sm:border-0">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handlePantryQtyChange(item.id, item.unit === 'g' ? -100 : -1)}
                                  className="w-6 h-6 rounded-lg bg-stone-100 dark:bg-slate-700 hover:bg-stone-200 dark:hover:bg-slate-600 flex items-center justify-center text-stone-600 dark:text-slate-300 border border-stone-200/50 dark:border-slate-600 cursor-pointer font-black select-none text-xs"
                                >
                                  -
                                </button>
                                <span className="w-16 text-center font-black text-xs text-[#2D2926] dark:text-slate-100 font-mono">
                                  {item.quantity} {item.unit}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handlePantryQtyChange(item.id, item.unit === 'g' ? 100 : 1)}
                                  className="w-6 h-6 rounded-lg bg-stone-100 dark:bg-slate-700 hover:bg-stone-200 dark:hover:bg-slate-600 flex items-center justify-center text-stone-600 dark:text-slate-300 border border-stone-200/50 dark:border-slate-600 cursor-pointer font-black select-none text-xs"
                                >
                                  +
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeletePantryItem(item.id)}
                                className="p-1.5 rounded bg-red-50 dark:bg-red-900 text-red-650 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-800 hover:text-red-800 transition-all cursor-pointer shadow-2xs"
                                title="Rimuovi Ingrediente"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Right Box: Add Product & Info (4/12) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Form Add to Pantry */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-[#3E4A35]" />
                  Stipa un nuovo Prodotto
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">Registra i viveri stipati negli armadietti durante il carico</p>

                <form onSubmit={handleAddPantryItem} className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[9px] uppercase font-black text-slate-500">Nome dell'Alimento</label>
                    <input
                      type="text"
                      required
                      placeholder="Es. Riso Arborio, Nutella, Birre..."
                      value={pantryName}
                      onChange={(e) => setPantryName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-stone-200 bg-stone-50 rounded-lg text-[#2D2926] focus:bg-white focus:outline-none focus:border-[#3E4A35]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[9px] uppercase font-black text-slate-500">Quantità Caricata</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={pantryQty}
                        onChange={(e) => setPantryQty(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-xs border border-stone-200 bg-stone-50 rounded-lg text-[#2D2926] focus:bg-white focus:outline-none focus:border-[#3E4A35] font-mono text-center font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[9px] uppercase font-black text-slate-500">Unità di Misura</label>
                      <select
                        value={pantryUnit}
                        onChange={(e) => setPantryUnit(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-stone-200 bg-stone-50 rounded-lg text-[#2D2926] focus:bg-white focus:outline-none focus:border-[#3E4A35] cursor-pointer"
                      >
                        <option value="lattina">Lattina/罐</option>
                        <option value="pacco">Pacco/Secchio</option>
                        <option value="g">Grammi (g)</option>
                        <option value="pz">Pezzi (pz)</option>
                        <option value="litro">Litri (L)</option>
                        <option value="ml">Millilitri (ml)</option>
                        <option value="confezione">Confezione</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] uppercase font-black text-slate-500">Categoria Cambusa</label>
                    <select
                      value={pantryCat}
                      onChange={(e) => setPantryCat(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-stone-200 bg-stone-50 rounded-lg text-[#2D2926] focus:bg-white focus:outline-none focus:border-[#3E4A35] cursor-pointer"
                    >
                      <option value="secche">Pasta, Riso & Secche</option>
                      <option value="scatolame">Scatolame, Tonno, Conserve</option>
                      <option value="freschi">Freschi, Formaggio, Verdura</option>
                      <option value="bevande">Bevande & Bottiglie d'Acqua</option>
                      <option value="spezie">Olio, Condimenti, Sale, Caffè</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white font-black rounded-lg text-xs tracking-wider transition-all uppercase cursor-pointer text-center shadow-sm"
                  >
                    Stipa in Dispensa
                  </button>
                </form>
              </div>

              {/* Informative advice on high weight food */}
              <div className="bg-stone-50 rounded-2xl border border-stone-200 p-4 space-y-2.5 text-[10.5px] leading-relaxed text-stone-600 font-medium h-fit">
                <span className="text-[9px] uppercase tracking-wider font-black text-[#A45C40] block flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  Meno Peso, Meno Consumo Camper:
                </span>
                <p>
                  Sapevi che stipare 30 rincari di cibo pesante e 4 confezioni di acqua minerale da 9kg l'una può sovraccaricare il camper di <b>+50 kg moltiplicati</b>?
                </p>
                <p className="text-stone-500 font-semibold leading-relaxed">
                  Strategia camperista: prediligi cibi disidratati o secchi leggerissimi a bordo, e acquista gli ingredienti freschi del giorno direttamente nei mercatini dei Paesi in cui sostate!
                </p>
              </div>

            </div>

          </div>
        )}

        {/* SCREEN B: RECIPES FOR OUTDOOR */}
        {activeSubTab === 'recipes' && (
          <div className="space-y-4">
            
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex gap-3 text-xs text-amber-900 font-medium">
              <Sparkles className="w-5 h-5 text-[#A45C40] shrink-0 mt-0.5 animate-bounce" />
              <div>
                <b className="text-stone-900 block">Ricette Salva-Risorse Ottimizzate per Camper d'Avanguardia:</b>
                Queste ricette sono studiate per impiegare pochissimo gas (ottimo per stufe Truma e bombole in inverno) e consumare il minor quantitativo d’acqua possibile per lavare le stoviglie (estende l'autonomia del serbatoio acque grigie!).
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {CAMPER_RECIPES.map(recipe => {
                // Check missing ingredients
                const missingCount = recipe.ingredientsNeeded.filter(ing => {
                  if (ing.pantryMatchId) {
                    const match = pantry.find(p => p.id === ing.pantryMatchId);
                    return !match || match.quantity <= 0 || match.isLow;
                  }
                  // substring match
                  const match = pantry.find(p => p.name.toLowerCase().includes(ing.name.toLowerCase()));
                  return !match || match.quantity <= 0;
                }).length;

                return (
                  <div key={recipe.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      
                      {/* Recipe Header */}
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h3 className="font-extrabold text-[#2D2926] text-sm leading-snug">{recipe.title}</h3>
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 font-bold">
                            <span>🕒 {recipe.durationMin} min</span>
                            <span>•</span>
                            <span>Pignatte richieste: {recipe.potsNeeded}</span>
                          </div>
                        </div>

                        {/* Camper Metrics Tags */}
                        <div className="flex flex-col gap-1 items-end shrink-0">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                            recipe.gasUsage === 'Basso' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-850'
                          }`}>
                            🔥 Gas: {recipe.gasUsage}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                            recipe.waterUsage === 'Minimo' ? 'bg-red-900/10 text-rose-800' : 'bg-sky-100 text-sky-800'
                          }`}>
                            💧 Acqua: {recipe.waterUsage}
                          </span>
                        </div>
                      </div>

                      {/* Ingredients list */}
                      <div className="bg-stone-50 p-3 rounded-xl border border-stone-150">
                        <span className="block text-[9px] uppercase font-black text-slate-400 mb-1.5 font-mono">Ingredienti Richiesti</span>
                        <ul className="text-xs space-y-1">
                          {recipe.ingredientsNeeded.map((ing, i) => {
                            // verify pantry status
                            let hasStock = false;
                            if (ing.pantryMatchId) {
                              const p = pantry.find(item => item.id === ing.pantryMatchId);
                              hasStock = p !== undefined && p.quantity > 0;
                            } else {
                              hasStock = pantry.some(p => p.name.toLowerCase().includes(ing.name.toLowerCase()) && p.quantity > 0);
                            }

                            return (
                              <li key={i} className="flex justify-between items-center py-0.5 font-medium leading-none">
                                <span className={hasStock ? 'text-slate-700' : 'text-slate-400 line-through'}>
                                  {ing.name}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[10px] text-slate-500 font-mono font-bold">({ing.qtyStr})</span>
                                  {hasStock ? (
                                    <span className="text-[10px] text-emerald-600 font-bold font-mono">✓ Dispensa</span>
                                  ) : (
                                    <span className="text-[9px] text-[#A45C40] bg-orange-50 px-1 rounded font-black font-mono">Manca</span>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>

                      {/* Instructions */}
                      <div className="space-y-1.5">
                        <span className="block text-[9px] uppercase font-black text-slate-400 font-mono">Istruzioni in Sosta</span>
                        <ol className="text-[11px] text-slate-600 space-y-1 pl-4 list-decimal font-medium leading-relaxed">
                          {recipe.instructions.map((inst, index) => (
                            <li key={index}>{inst}</li>
                          ))}
                        </ol>
                      </div>

                    </div>

                    {/* Footer Trigger buttons */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
                      <div>
                        {missingCount > 0 ? (
                          <span className="text-[10px] text-[#A45C40] font-black">
                            ⚠️ Mancano {missingCount} ingredienti
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-black">
                            ✓ Pronto per cucinare!
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => addRecipeIngredientsToShoppingList(recipe)}
                        className="px-3.5 py-2 bg-[#3E4A35] hover:bg-[#5A6B4E] active:scale-95 text-white text-[10px] font-black rounded-lg transition-all shadow-xs flex items-center gap-1 uppercase tracking-wider cursor-pointer"
                      >
                        <span>Lista Spesa</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* SCREEN C: INTELLIGENT GROCERY LIST */}
        {activeSubTab === 'shopping' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Box: Active items checklist (8/12) */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
              
              <div className="flex justify-between items-center flex-wrap gap-2 pb-3 border-b border-stone-100">
                <div>
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Mettere nel carrello</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Batti spunta sui prodotti acquistati. Integrali poi nelle scorte con un solo tocco!</p>
                </div>

                <div className="flex gap-2 shrink-0">
                  {shoppingList.filter(s => s.isCompleted).length > 0 && (
                    <button
                      type="button"
                      onClick={handleImportCompletedToPantry}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] rounded-lg transition-all uppercase tracking-wider flex items-center gap-1 shadow-sm cursor-pointer"
                      title="Sposta i prodotti che hai acquistato nella tua Dispensa principale"
                    >
                      <Check className="w-3 text-white" />
                      <span>Sposta in Dispensa</span>
                    </button>
                  )}
                  
                  {shoppingList.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearCompletedShop}
                      className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-slate-600 font-black text-[10px] rounded-lg transition-all uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                      title="Elimina tutti gli elementi spuntati"
                    >
                      <span>Pulisci Lista</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Grocery checklist block */}
              {shoppingList.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-stone-150 rounded-2xl space-y-3">
                  <ShoppingBag className="w-12 h-12 text-slate-350 mx-auto animate-bounce" />
                  <h4 className="font-extrabold text-slate-600 text-sm">La lista della spesa è vuota</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
                    Aggiungi ingredienti usando il modulo laterale, forzando un alert esaurito in Cambusa o spingendo ingredienti direttamente dal tab Ricette.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {shoppingList.map(item => (
                    <div 
                      key={item.id} 
                      className={`py-3 flex items-center justify-between gap-3 text-left transition-all ${
                        item.isCompleted ? 'bg-stone-50/70 dark:bg-slate-900/50 opacity-55 line-through dark:text-slate-500' : 'dark:text-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <button
                          type="button"
                          onClick={() => handleToggleShopCompleted(item.id)}
                          className={`shrink-0 cursor-pointer ${item.isCompleted ? 'text-emerald-500 dark:text-emerald-700' : 'text-slate-400 dark:text-slate-600 hover:text-[#3E4A35] dark:hover:text-emerald-400'}`}
                        >
                          {item.isCompleted ? (
                            <CheckSquare className="w-5 h-5" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>

                        <div className="min-w-0">
                          <h4 className="font-extrabold text-[#2D2926] dark:text-slate-100 text-xs leading-none">
                            {item.name}
                          </h4>
                          <span className="text-[9px] font-black tracking-wider uppercase text-slate-450 dark:text-slate-500 font-mono mt-0.5 inline-block">
                            quantità: <b>{item.quantityStr}</b> {item.category === 'ricetta' && '• Mancante per Ricetta'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShoppingList(prev => prev.filter(s => s.id !== item.id))}
                        className="p-1 px-1.5 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-extrabold text-xs shrink-0 cursor-pointer"
                        title="Cancella questo elemento"
                      >
                        ×
                      </button>

                    </div>
                  ))}
                </div>
              )}

            </div>

            {/* Right Box: Quick Add Shopping Form (4/12) */}
            <div className="lg:col-span-4 space-y-6">
              
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-[#A45C40]" />
                  Aggiungi a mano al carrello
                </h3>
                <p className="text-[11px] text-slate-400 font-medium font-bold leading-normal">Se ti sei accorto che manca qualcosa sul camper, segnalalo subito qui</p>

                <form onSubmit={handleAddShoppingItem} className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[9px] uppercase font-black text-slate-500">Nome Prodotto</label>
                    <input
                      type="text"
                      required
                      placeholder="Es. Svelto piatti, Rotolone asciugatutto..."
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-stone-200 bg-stone-50 rounded-lg text-[#2D2926] focus:bg-white focus:outline-none focus:border-[#3E4A35]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[9px] uppercase font-black text-slate-500">Formato / Qty</label>
                      <input
                        type="text"
                        placeholder="Es. 2 scatole, 500g"
                        value={shopQtyStr}
                        onChange={(e) => setShopQtyStr(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-stone-200 bg-stone-50 rounded-lg text-[#2D2926] focus:bg-white focus:outline-none focus:border-[#3E4A35] font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[9px] uppercase font-black text-slate-500">Categoria listino</label>
                      <select
                        value={shopCat}
                        onChange={(e) => setShopCat(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-stone-200 bg-stone-50 rounded-lg text-[#2D2926] focus:bg-white focus:outline-none focus:border-[#3E4A35] cursor-pointer"
                      >
                        <option value="generico">Generico Camper</option>
                        <option value="freschi">Alimentari Freschi</option>
                        <option value="bevande">Bevande & Sete</option>
                        <option value="accessori">Accessorio Tecnico</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-[#3E4A35] hover:bg-[#5A6B4E] text-white font-black rounded-lg text-xs tracking-wider transition-all uppercase cursor-pointer text-center shadow-sm"
                  >
                    Segna in Lista Spesa
                  </button>
                </form>
              </div>

              {/* Informative advice */}
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl text-[10px] text-stone-500 leading-relaxed font-semibold">
                <Info className="w-4 h-4 text-[#3E4A35] shrink-0 mb-1" />
                Dall'app puoi spuntare i prodotti acquistati durante la spesa fisica al supermercato e cliccare "Sposta in Dispensa" per incrementare i carichi di bordo automaticamente, mantenendo sincronizzato l'inventario generale!
              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}
