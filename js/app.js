
(function(){
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));
  const money = (n)=> `${(window.BRAND && BRAND.currency) ? BRAND.currency : "€"}${Number(n).toFixed(2)}`;

  // ---- storage helpers
  const store = {
    get(key, fallback){
      try{ return JSON.parse(localStorage.getItem(key)) ?? fallback; }catch{ return fallback; }
    },
    set(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
  };

  // ---- Cart
  const CART_KEY = "hc_cart_v2";
  const CHECKOUT_KEY = "hc_checkout_v2";
  function getCart(){ return store.get(CART_KEY, []); }
  function setCart(items){ store.set(CART_KEY, items); renderCartBadge(); }
  function addToCart(productId, qty=1){
    const cart = getCart();
    const found = cart.find(x => x.id === productId);
    if(found) found.qty += qty;
    else cart.push({id: productId, qty});
    setCart(cart);
  }
  function removeFromCart(productId){
    setCart(getCart().filter(x=>x.id !== productId));
  }
  function updateQty(productId, qty){
    const cart = getCart().map(x => x.id === productId ? ({...x, qty: Math.max(1, qty)}) : x);
    setCart(cart);
  }
  
  function setCheckoutDraftFromCart(){
    const cart = getCart();
    store.set(CHECKOUT_KEY, {items: cart, ts: Date.now()});
  }
  function setCheckoutDraftSingle(productId, qty=1){
    store.set(CHECKOUT_KEY, {items: [{id: productId, qty: Math.max(1, qty)}], ts: Date.now()});
  }
  function getCheckoutDraft(){
    return store.get(CHECKOUT_KEY, null);
  }

function cartSummary(){
    const cart = getCart();
    const lines = [];
    let total = 0;
    for(const item of cart){
      const p = PRODUCTS.find(x=>x.id===item.id);
      if(!p) continue;
      const lineTotal = p.price * item.qty;
      total += lineTotal;
      lines.push(`• ${p.name} — ${item.qty} x ${money(p.price)} = ${money(lineTotal)}`);
    }
    return {lines, total, count: cart.reduce((a,b)=>a+b.qty,0)};
  }

  // ---- Reviews + satisfaction per product (stored locally)
  const REV_KEY = "hc_reviews_v1"; // { [productId]: [{name, rating, text, ts}] }
  function getReviewsAll(){ return store.get(REV_KEY, {}); }
  function getReviews(productId){ return (getReviewsAll()[productId] || []); }
  function getSeedReviews(productId){ return (window.SEED_REVIEWS && window.SEED_REVIEWS[productId]) ? window.SEED_REVIEWS[productId] : []; }
  function getReviewsForDisplay(productId){
    // Local reviews (user submitted) + seeded "verified" reviews to make the site feel alive
    return [...getReviews(productId), ...getSeedReviews(productId)];
  }

  function addReview(productId, review){
    const all = getReviewsAll();
    all[productId] = all[productId] || [];
    all[productId].unshift(review);
    store.set(REV_KEY, all);
  }
  function calcLocalRating(productId){
    const reviews = getReviewsForDisplay(productId);
    if(reviews.length === 0) return null;
    const avg = reviews.reduce((a,r)=>a+r.rating,0)/reviews.length;
    return {avg: Math.round(avg*10)/10, count: reviews.length};
  }


  // ---- Wishlist (Saved locally)
  const WISH_KEY = "hc_wishlist_v1"; // [productId,...]
  function getWishlist(){ return store.get(WISH_KEY, []); }
  function setWishlist(ids){ store.set(WISH_KEY, ids); renderWishBadge(); }
  function isWished(productId){ return getWishlist().includes(productId); }
  function toggleWish(productId){
    const ids = getWishlist();
    const idx = ids.indexOf(productId);
    if(idx >= 0) ids.splice(idx, 1);
    else ids.unshift(productId);
    setWishlist(ids);
    return idx < 0;
  }
  function renderWishBadge(){
    const badge = $("#wishCount");
    if(!badge) return;
    const n = getWishlist().length;
    badge.textContent = String(n);
    badge.style.opacity = n ? "1" : ".55";
  }
  // ---- WhatsApp
  function openWhatsApp(message){
    const phone = BRAND.whatsapp_phone.replace(/[^\d]/g,'');
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  
  function ratingBreakdown(productId){
    const reviews = getReviewsForDisplay(productId);
    const dist = {1:0,2:0,3:0,4:0,5:0};
    for(const r of reviews){ dist[r.rating] = (dist[r.rating]||0)+1; }
    const total = reviews.length || 1;
    return {dist, total};
  }

function stars(r){
    const full = Math.round(r);
    const s = "★★★★★☆☆☆☆☆".slice(5-full, 10-full); // trick
    return s;
  }

  // ---- UI helpers
  function renderCartBadge(){
    const badge = $("#cartCount");
    if(!badge) return;
    const {count} = cartSummary();
    badge.textContent = String(count);
    badge.style.opacity = count ? "1" : ".55";
  }

  function mountHeader(){
    renderCartBadge();
    renderWishBadge();
    const search = $("#globalSearch");
    if(search){
      search.addEventListener("input", () => {
        const q = search.value.trim();
        const url = new URL(window.location.href);
        url.searchParams.set("q", q);
        if(!q) url.searchParams.delete("q");
        history.replaceState({}, "", url);
        if(window.renderProductList) window.renderProductList();
      });
    }
    const waBtn = $("#whatsAppBtn");
    if(waBtn){
      waBtn.addEventListener("click", () => {
        openWhatsApp("Hello! I want to order from " + BRAND.name + ".");
      });
    }
  }

  // ---- Pages
  function renderHome(){
    const grid = $("#homeGrid");
    if(!grid) return;
    const featured = [...PRODUCTS].sort((a,b)=>b.rating-a.rating).slice(0, 8);
    grid.innerHTML = featured.map(cardHTML).join("");
    wireCards(grid);
  }

  function cardHTML(p){
    const local = calcLocalRating(p.id);
    const rating = local?.avg ?? p.rating;
    const count = local?.count ?? p.reviewsCount;
    return `
    <article class="card">
      <a class="thumb" href="product.html?id=${encodeURIComponent(p.id)}" aria-label="Open ${escapeHtml(p.name)}">
        <img src="${p.image}" alt="">
      </a>
      <div class="card-body">
        <h3>${escapeHtml(p.name)}</h3>
        <div class="meta">
          <span class="pill">${escapeHtml(p.category)}</span>
          <span class="price">${money(p.price)}</span>${p.oldPrice ? `<span class="note" style="text-decoration:line-through; margin-left:8px">${money(p.oldPrice)}</span><span class="pill" style="margin-left:8px">-${p.discountPct || Math.round((1-(p.price/p.oldPrice))*100)}%</span>` : ""}
        </div>
        <div class="row">
          <span class="pill"><span class="star">★</span> ${rating} <small class="note">(${count})</small></span>
          <button class="btn ghost wish-btn ${isWished(p.id) ? "liked" : ""}" data-wish="${p.id}" aria-label="Add to wishlist">❤</button>
          <button class="btn" data-add="${p.id}">Add</button>
        </div>
      </div>
    </article>`;
  }

  function wireCards(root){
    $$("[data-add]", root).forEach(btn=>{
      btn.addEventListener("click", (e)=>{
        e.preventDefault();
        addToCart(btn.getAttribute("data-add"), 1);
        toast("Added to cart");
      });
    });

    $$("[data-wish]", root).forEach(btn=>{
      btn.addEventListener("click", (e)=>{
        e.preventDefault();
        const id = btn.getAttribute("data-wish");
        const added = toggleWish(id);
        btn.classList.toggle("liked", added);
        toast(added ? "Added to wishlist" : "Removed from wishlist");
      });
    });
  }


  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }

  function toast(msg){
    const el = document.createElement("div");
    el.textContent = msg;
    el.style.position = "fixed";
    el.style.left = "50%";
    el.style.bottom = "18px";
    el.style.transform = "translateX(-50%)";
    el.style.padding = "10px 14px";
    el.style.border = "1px solid rgba(255,255,255,.18)";
    el.style.borderRadius = "14px";
    el.style.background = "rgba(11,15,10,.92)";
    el.style.boxShadow = "0 12px 40px rgba(0,0,0,.35)";
    el.style.zIndex = "9999";
    document.body.appendChild(el);
    setTimeout(()=>{ el.style.opacity = "0"; el.style.transition="opacity .25s"; }, 1200);
    setTimeout(()=> el.remove(), 1500);
  }

  
  function sortCategoryOptions(){
    const catSel = document.getElementById("catSelect");
    if(!catSel) return;
    const opts = Array.from(catSel.querySelectorAll("option"));
    const first = opts.find(o=>o.value==="All");
    const rest = opts.filter(o=>o.value!=="All").sort((a,b)=>a.textContent.localeCompare(b.textContent));
    catSel.innerHTML = "";
    if(first) catSel.appendChild(first);
    rest.forEach(o=>catSel.appendChild(o));
  }

  // Product list page (products.html)
  window.renderProductList = function(){
    const grid = $("#productGrid");
    if(!grid) return;

    const url = new URL(window.location.href);
    const q = (url.searchParams.get("q") || "").toLowerCase();
    const catParam = url.searchParams.get("cat");
    const knownCats = new Set(PRODUCTS.map(p=>p.category));
    const cat = (catParam && knownCats.has(catParam)) ? catParam : "All";
    const sort = url.searchParams.get("sort") || "popular";

    // sync inputs
    const search = $("#globalSearch");
    if(search && search.value !== (url.searchParams.get("q")||"")) search.value = url.searchParams.get("q")||"";
    const catSel = $("#catSelect");
    if(catSel) catSel.value = cat;
    const sortSel = $("#sortSelect");
    if(sortSel) sortSel.value = sort;

    let list = PRODUCTS.slice();
    if(cat !== "All") list = list.filter(p => p.category === cat);
    if(q) list = list.filter(p => (p.name + " " + p.short).toLowerCase().includes(q));

    if(sort === "price_asc") list.sort((a,b)=>a.price-b.price);
    if(sort === "price_desc") list.sort((a,b)=>b.price-a.price);
    if(sort === "rating") list.sort((a,b)=>(calcLocalRating(b.id)?.avg ?? b.rating) - (calcLocalRating(a.id)?.avg ?? a.rating));
    if(sort === "popular") list.sort((a,b)=>(calcLocalRating(b.id)?.count ?? b.reviewsCount) - (calcLocalRating(a.id)?.count ?? a.reviewsCount));

    $("#resultsCount") && ($("#resultsCount").textContent = `${list.length} products`);
    grid.innerHTML = list.map(cardHTML).join("");
    wireCards(grid);
  };

  function populateCategorySelect(){
    const sel = document.getElementById("catSelect");
    if(!sel) return;

    // Build category list from PRODUCTS (exact values, no HTML-escaping in value)
    const cats = Array.from(new Set(PRODUCTS.map(p=>p.category))).sort((a,b)=>a.localeCompare(b));
    const current = new URL(window.location.href).searchParams.get("cat") || "All";

    sel.innerHTML = "";
    sel.appendChild(new Option("All", "All"));

    for(const c of cats){
      sel.appendChild(new Option(c, c));
    }

    // Restore selection if present
    sel.value = cats.includes(current) ? current : "All";
  }

  function wireProductListFilters(){
    const catSel = $("#catSelect");
    const sortSel = $("#sortSelect");
    const apply = ()=>{
      const url = new URL(window.location.href);
      if(catSel && catSel.value !== "All") url.searchParams.set("cat", catSel.value); else url.searchParams.delete("cat");
      if(sortSel) url.searchParams.set("sort", sortSel.value);
      history.replaceState({}, "", url);
      window.renderProductList();
    };
    catSel && catSel.addEventListener("change", apply);
    sortSel && sortSel.addEventListener("change", apply);
  }

  // Product detail
  function renderProductDetail(){
    const mount = $("#productDetail");
    if(!mount) return;

    const url = new URL(window.location.href);
    const id = url.searchParams.get("id");
    const p = PRODUCTS.find(x=>x.id === id) || PRODUCTS[0];

    const local = calcLocalRating(p.id);
    const rating = local?.avg ?? p.rating;
    const count = local?.count ?? p.reviewsCount;

    mount.innerHTML = `
      <div class="hero-card">
        <div class="hero-inner">
          <div>
            <div class="pill">${escapeHtml(p.category)} • ${escapeHtml(p.unit)} • SKU: ${escapeHtml(p.sku)}</div>
            <h2 style="margin:.6rem 0 .4rem">${escapeHtml(p.name)}</h2>
            <p>${escapeHtml(p.short)}</p>

            
<div class="kpis" style="margin-top:14px">
              <div class="kpi">
                <b class="price">${money(p.price)}</b><div class="note" style="margin-top:6px"><span style="text-decoration:line-through">${money(p.oldPrice)}</span> <span class="pill">Save ${p.discountPct}%</span></div>
                <span>Distributor price (no online payment)</span>
              </div>
              <div class="kpi">
                <b><span class="star">★</span> ${rating} <small class="note">(${count})</small></b>
                <span>Customer satisfaction (rating + feedback)</span>
              </div>
              <div class="kpi">
                <b>WhatsApp Order</b>
                <span>Send your order instantly via WhatsApp</span>
              </div>
            </div>

            <div class="hr"></div>
            <div class="kpi" style="border-radius:16px; padding:14px; border:1px solid var(--stroke); background: rgba(0,0,0,.18);">
              <b>Detailed description</b>
              <span style="margin-top:6px; display:block">${escapeHtml(p.long || p.short)}</span>
              <ul style="margin:10px 0 0; padding-left:18px; color: var(--muted)">
                ${p.details.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}
              </ul>
            </div>

            <div class="row" style="margin-top:14px">
              <button class="btn ghost" id="wishBtn" aria-label="Wishlist">❤</button>
              <button class="btn" id="addToCartBtn">Add to cart</button>
              <button class="btn primary" id="orderNowBtn">Order via WhatsApp</button>
            </div>
            <small class="note">No online payments. We confirm availability, delivery, and payment method via WhatsApp.</small>
          </div>

          <div class="card" style="margin:0">
            <div class="thumb"><img src="${p.image}" alt=""></div>
            <div class="card-body">
              <h3>Product information</h3>
              <div class="hr"></div>
              <div class="meta"><span>Origin</span><span>${escapeHtml(p.origin || "Kosovo / curated imports")}</span></div>
              <div class="meta"><span>Ingredients</span><span>${escapeHtml(p.ingredients || "See packaging / ask via WhatsApp")}</span></div>
              <div class="hr"></div>
              <ul style="margin:0; padding-left: 18px; color: var(--muted)">
                ${p.details.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div class="section-title">
        <div>
          <h2>Reviews & comments</h2>
          <p>Share your experience — it helps others choose confidently.</p>
        </div>
        <button class="btn" id="writeReviewBtn">Write a review</button>
      </div>

      <div class="grid" id="reviewsGrid"></div>

      <dialog id="reviewDialog" aria-label="Write a review">
        <div class="modal-head">
          <b>Write a review</b>
          <button class="btn" id="closeReview">Close</button>
        </div>
        <div class="modal-body">
          <div class="split">
            <div>
              <label>Your name</label>
              <input class="input" id="revName" placeholder="e.g., Arta" />
              <div style="height:10px"></div>
              <label>Rating</label>
              <select id="revRating">
                <option value="5">5 - Excellent</option>
                <option value="4">4 - Very good</option>
                <option value="3">3 - Good</option>
                <option value="2">2 - Fair</option>
                <option value="1">1 - Poor</option>
              </select>
            </div>
            <div>
              <label>Comment</label>
              <textarea id="revText" placeholder="What did you like? How did you use it?"></textarea>
              <div style="height:10px"></div>
              <button class="btn primary" id="submitReview">Submit review</button>
              <small class="note">Reviews are saved in your browser (local demo). For production, connect to a backend.</small>
            </div>
          </div>
        </div>
      </dialog>
    `;

    const wishBtn = $("#wishBtn");
    if(wishBtn){
      const sync = ()=> wishBtn.classList.toggle("liked", isWished(p.id));
      sync();
      wishBtn.addEventListener("click", ()=>{
        const added = toggleWish(p.id);
        wishBtn.classList.toggle("liked", added);
        toast(added ? "Added to wishlist" : "Removed from wishlist");
      });
    }

    $("#addToCartBtn").addEventListener("click", ()=>{ addToCart(p.id, 1); toast("Added to cart"); });
    $("#orderNowBtn").addEventListener("click", ()=>{ setCheckoutDraftSingle(p.id, 1); window.location.href = "complete-order.html"; });

    // Reviews
    const dlg = $("#reviewDialog");
    $("#writeReviewBtn").addEventListener("click", ()=> dlg.showModal());
    $("#closeReview").addEventListener("click", ()=> dlg.close());
    $("#submitReview").addEventListener("click", ()=>{
      const name = ($("#revName").value || "Anonymous").trim().slice(0,40);
      const rating = Number($("#revRating").value || 5);
      const text = ($("#revText").value || "").trim().slice(0,500);
      if(!text){ toast("Please write a comment."); return; }
      addReview(p.id, {name, rating, text, ts: Date.now()});
      $("#revText").value = "";
      dlg.close();
      renderReviews(p.id);
      // refresh local rating in hero
      renderProductDetail(); // simple rerender
    });

    renderReviews(p.id);
  }

  
  function renderBreakdown(productId){
    const mount = document.getElementById("breakdownMount");
    if(!mount) return;
    const {dist, total} = ratingBreakdown(productId);
    const rows = [5,4,3,2,1].map(star=>{
      const n = dist[star] || 0;
      const pct = Math.round((n/total)*100);
      return `<div class="meta" style="width:100%; gap:12px">
        <span class="pill" style="min-width:78px"><span class="star">★</span> ${star}</span>
        <div style="flex:1; height:10px; border-radius:999px; border:1px solid var(--stroke); background: rgba(255,255,255,.03); overflow:hidden">
          <div style="height:100%; width:${pct}%; background: linear-gradient(135deg, rgba(244,180,0,.95), rgba(52,168,83,.90));"></div>
        </div>
        <span class="pill" style="min-width:70px; justify-content:center">${n}</span>
      </div>`;
    }).join("");
    mount.innerHTML = rows;
  }

function renderReviews(productId){
    const grid = $("#reviewsGrid");
    if(!grid) return;
    const reviews = getReviewsForDisplay(productId);
    if(reviews.length === 0){
      grid.innerHTML = `<div class="kpi" style="grid-column:1/-1">
        <b>No reviews yet</b>
        <span>Be the first to leave a comment and rating.</span>
      </div>`;
      return;
    }
    grid.innerHTML = reviews.slice(0, 24).map(r=>{
      const date = new Date(r.ts).toLocaleDateString();
      return `<div class="kpi">
        <b><span class="star">★</span> ${r.rating} <small class="note">• ${escapeHtml(r.name)} • ${date}</small></b>
        <span>${escapeHtml(r.text)}</span>
      </div>`;
    }).join("");
  }

  function orderProductViaWhatsApp(productId, qty){
    const p = PRODUCTS.find(x=>x.id===productId);
    if(!p) return;
    const msg = [
      `Hello! I want to order from ${BRAND.name}.`,
      ``,
      `Product: ${p.name}`,
      `Quantity: ${qty}`,
      `Price: ${money(p.price)} each`,
      ``,
      `Please confirm availability and delivery details.`
    ].join("\n");
    openWhatsApp(msg);
  }

  // Cart page
  function renderCartPage(){
    const mount = $("#cartMount");
    if(!mount) return;
    const cart = getCart();
    if(cart.length === 0){
      mount.innerHTML = `<div class="kpi"><b>Your cart is empty</b><span>Add products and then send the order via WhatsApp.</span></div>`;
      return;
    }
    const rows = cart.map(item=>{
      const p = PRODUCTS.find(x=>x.id===item.id);
      if(!p) return "";
      const line = p.price * item.qty;
      return `<tr>
        <td>${escapeHtml(p.name)} <small class="note">(${escapeHtml(p.unit)})</small></td>
        <td>${money(p.price)}</td>
        <td>
          <input class="input" style="min-width:80px;width:120px" type="number" min="1" value="${item.qty}" data-qty="${p.id}">
        </td>
        <td><b class="price">${money(line)}</b></td>
        <td><button class="btn" data-remove="${p.id}">Remove</button></td>
      </tr>`;
    }).join("");

    const {total, count} = cartSummary();
    mount.innerHTML = `
      <table class="table">
        <thead><tr>
          <th>Product</th><th>Price</th><th>Qty</th><th>Total</th><th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="hr"></div>
      <div class="kpis">
        <div class="kpi"><b>${count} items</b><span>Total items in cart</span></div>
        <div class="kpi"><b class="price">${money(total)}</b><span>Estimated total (final confirmed on WhatsApp)</span></div>
        <div class="kpi"><b>Payment</b><span>No online payment. We confirm payment method via WhatsApp.</span></div>
      </div>
      <div class="row" style="margin-top:14px">
        <button class="btn" id="clearCart">Clear cart</button>
        <button class="btn primary" id="sendOrder">Send order via WhatsApp</button>
      </div>
      <small class="note">Tip: Include delivery address in WhatsApp message.</small>
    `;

    $$("[data-remove]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        removeFromCart(btn.getAttribute("data-remove"));
        renderCartPage();
      });
    });
    $$("[data-qty]").forEach(inp=>{
      inp.addEventListener("input", ()=>{
        const id = inp.getAttribute("data-qty");
        updateQty(id, Number(inp.value || 1));
        renderCartPage();
      });
    });
    $("#clearCart").addEventListener("click", ()=>{ setCart([]); renderCartPage(); });
    $("#sendOrder").addEventListener("click", ()=>{ setCheckoutDraftFromCart(); window.location.href = "complete-order.html"; });
  }


  // Wishlist page
  function renderWishlistPage(){
    const mount = $("#wishlistMount");
    if(!mount) return;

    const ids = getWishlist();
    if(ids.length === 0){
      mount.innerHTML = `<div class="kpi"><b>Your wishlist is empty</b><span>Tap ❤ on products to save them here.</span></div>`;
      return;
    }

    const items = ids.map(id=>PRODUCTS.find(p=>p.id===id)).filter(Boolean);
    mount.innerHTML = `
      <div class="section-title" style="margin-top:0">
        <div>
          <h2>Wishlist</h2>
          <p>${items.length} saved items</p>
        </div>
        <div class="row">
          <a class="btn" href="products.html">Continue shopping</a>
          <button class="btn primary" id="wishAddAll" type="button">Add all to cart</button>
        </div>
      </div>
      <section class="grid" id="wishGrid">${items.map(cardHTML).join("")}</section>
    `;
    const grid = $("#wishGrid");
    wireCards(grid);

    // Remove from wishlist from cards
    $$("[data-wish]", grid).forEach(btn=>{
      btn.classList.add("liked");
    });

    $("#wishAddAll").addEventListener("click", ()=>{
      items.forEach(p=> addToCart(p.id, 1));
      toast("Added wishlist to cart");
    });
  }
  // Categories page
  function renderCategories(){
    const mount = $("#catGrid");
    if(!mount) return;
    const cats = Array.from(new Set(PRODUCTS.map(p=>p.category))).sort((a,b)=>a.localeCompare(b));
    mount.innerHTML = cats.map(c=>{
      const count = PRODUCTS.filter(p=>p.category===c).length;
      return `<a class="card" href="products.html?cat=${encodeURIComponent(c)}">
        <div class="card-body">
          <h3>${escapeHtml(c)}</h3>
          <div class="meta"><span>${count} products</span><span class="pill">Browse</span></div>
        </div>
      </a>`;
    }).join("");
  }

  // Footer year + brand
  
  // Best Seller popup (uses images in assets/Pop_ups_images/)
  
  function initBestSellerRail(){
    const rail = document.getElementById("bestSellerRail");
    if(!rail || !window.BEST_SELLER_POPUPS || !Array.isArray(window.BEST_SELLER_POPUPS) || window.BEST_SELLER_POPUPS.length===0) return;

    const items = window.BEST_SELLER_POPUPS.slice();
    let i = 0;

    const niceName = (path)=>{
      const file = (path || "").split("/").pop() || "";
      return file.replace(/\.(jpg|jpeg|png|webp)$/i,"").replace(/[_-]+/g," ").trim();
    };

    const render = ()=>{
      const pick = items[i % items.length];
      rail.innerHTML = `
        <div class="rail-card">
          <div class="rail-img">
            <img src="${pick.image}" alt="Best seller">
          </div>
          <div class="rail-body">
            <div>
              <b>🔥 Best Seller</b><br>
              <small>${escapeHtml(niceName(pick.image))}</small>
            </div>
            <a class="btn primary" href="products.html">Shop</a>
          </div>
        </div>
      `;
      i++;
    };

    render();
    setInterval(render, 4500);
  }


function showBestSellerPopup(){
    const dlg = document.getElementById("bestSellerDialog");
    if(!dlg || !window.BEST_SELLER_POPUPS || !Array.isArray(window.BEST_SELLER_POPUPS)) return;

    // once per session
    const key = "hc_best_seller_shown_v1";
    if(sessionStorage.getItem(key) === "1") return;
    sessionStorage.setItem(key, "1");

    const pick = window.BEST_SELLER_POPUPS[Math.floor(Math.random()*window.BEST_SELLER_POPUPS.length)];
    const img = document.getElementById("bestSellerImg");
    const title = document.getElementById("bestSellerTitle");
    const close = document.getElementById("closeBestSeller");
    
    // Extract product name from image path
    const getProductName = (path) => {
      const file = (path || "").split("/").pop() || "";
      return file.replace(/\.(jpg|jpeg|png|webp)$/i,"").replace(/[_-]+/g," ").trim() || "Produkt i Preferuar";
    };
    
    if(title) title.textContent = getProductName(pick.image);
    if(img && pick?.image) img.src = pick.image;

    close && close.addEventListener("click", ()=> dlg.close());
    setTimeout(()=>{ try{ dlg.showModal(); }catch{} }, 650);
  }


function mountBrand(){
    $$("#brandName").forEach(el=> el.textContent = BRAND.name);
    $$("#brandTagline").forEach(el=> el.textContent = BRAND.tagline);
    const y = $("#year");
    if(y) y.textContent = String(new Date().getFullYear());
  }


  // Checkout page (Complete Your Order)



  function renderCheckoutPage(){
    const mount = document.getElementById("checkoutMount");
    if(!mount) return;

    const draft = getCheckoutDraft();
    const itemsRaw = draft?.items || [];
    if(itemsRaw.length === 0){
      mount.innerHTML = `<div class="kpi"><b>No order selected</b><span>Please add products to your cart first.</span><div class="hr"></div><a class="btn primary" href="products.html">Go to Shop</a></div>`;
      return;
    }

    const items = itemsRaw.map(it=>{
      const p = PRODUCTS.find(x=>x.id===it.id);
      const price = p ? p.price : 0;
      const name = p ? p.name : it.id;
      const line = price * it.qty;
      return {id: it.id, name, qty: it.qty, price, line};
    });
    const totalVal = items.reduce((a,b)=>a+b.line,0);
    const moneyLocal = (n)=> `${BRAND.currency}${Number(n).toFixed(2)}`;

    // Delivery window (example: 25 shkurt 2026 - 26 shkurt 2026)
    const now = new Date();
    const d1 = new Date(now); d1.setDate(now.getDate()+2);
    const d2 = new Date(now); d2.setDate(now.getDate()+3);
    const fmt = (d)=> d.toLocaleDateString("sq-AL", {day:"2-digit", month:"long", year:"numeric"});
    const deliveryWindow = `${fmt(d1)} - ${fmt(d2)}`;

    const summaryHtml = items.map(it=>`
      <div class="kpi" style="margin:0">
        <b>${escapeHtml(it.name)}</b>
        <span>${escapeHtml(String(it.qty))} x ${moneyLocal(it.price)} — <b class="price">${moneyLocal(it.line)}</b></span>
      </div>
    `).join("");

    mount.innerHTML = `
      <div class="split">
        <div>
          <div class="hero-card">
            <div class="modal-head" style="border-bottom:1px solid var(--stroke)">
              <b>🛒 Complete Your Order</b>
              <span class="pill">${items.length} items</span>
            </div>
            <div class="modal-body">
              <b style="display:block; margin-bottom:10px">Order Summary</b>
              <div style="display:grid; gap:10px">
                ${summaryHtml}
              </div>
              <div class="hr"></div>
              <div class="meta" style="justify-content:space-between">
                <b>Total:</b>
                <b class="price" style="font-size:1.15rem">${moneyLocal(totalVal)}</b>
              </div>
              <div class="hr"></div>
              <div class="kpi" style="margin:0">
                <b>Transporti</b>
                <span>${escapeHtml(deliveryWindow)}</span>
                <small class="note">Transport falas në të gjithë Kosovën.</small>
              </div>
            </div>
          </div>
        </div>

        <div class="hero-card">
          <div class="modal-head" style="border-bottom:1px solid var(--stroke)">
            <b>Merre porosinë</b>
            <span class="pill">Required *</span>
          </div>
          <div class="modal-body">
            <form id="checkoutForm">
              <div class="toggle">
                <button class="toggle-btn active" type="button" data-mode="delivery">Transport</button>
                <button class="toggle-btn" type="button" data-mode="pickup">Merre në dyqan</button>
              </div>
              <small class="note" id="modeHint" style="display:block; margin-top:8px">Plotësoni adresën e transportit</small>

              <div style="height:12px"></div>
              <div class="toggle">
                <button class="toggle-btn active" type="button" data-type="individual">Individ</button>
                <button class="toggle-btn" type="button" data-type="business">Biznes</button>
              </div>

              <div style="height:12px"></div>
              <div class="split-2">
                <div>
                  <label>Emri *</label>
                  <input class="input" id="firstName" placeholder="Emri" required>
                </div>
                <div>
                  <label>Mbiemri *</label>
                  <input class="input" id="lastName" placeholder="Mbiemri" required>
                </div>
              </div>

              <div style="height:10px"></div>
              <label>Numri i telefonit *</label>
              <input class="input" id="phoneNumber" placeholder="+383..." required>

              <div style="height:10px"></div>
              <label>Qyteti *</label>
              <select id="city" class="input" required>
                <option value="">Zgjedhni qytetin</option>
                <option>Prishtinë</option><option>Prizren</option><option>Pejë</option><option>Gjakovë</option>
                <option>Mitrovicë</option><option>Ferizaj</option><option>Gjilan</option><option>Vushtrri</option>
                <option>Fushë Kosovë</option><option>Podujevë</option><option>Suharekë</option><option>Drenas</option>
              </select>

              <div id="deliveryFields">
                <div style="height:10px"></div>
                <label>Adresa *</label>
                <input class="input" id="deliveryAddress" placeholder="Rruga, numri, hyrja..." required>

                <div style="height:10px"></div>
                <label>E-mail</label>
                <input class="input" id="email" placeholder="email@example.com" type="email">
              </div>

              <div id="businessFields" style="display:none">
                <div style="height:10px"></div>
                <label>Kompania</label>
                <input class="input" id="company" placeholder="Emri i kompanisë">

                <div style="height:10px"></div>
                <label>Numri fiskal</label>
                <input class="input" id="fiscalNumber" placeholder="Numri fiskal">
              </div>

              <div style="height:10px"></div>
              <label>Shto koment</label>
              <textarea id="notes" placeholder="P.sh., thirr para dorëzimit, koha më e mirë..."></textarea>

              <div style="height:12px"></div>
              <button class="btn primary" type="submit" style="width:100%">Send Order via WhatsApp</button>

              <div style="height:10px"></div>
              <small class="note">By clicking the button, you will open WhatsApp with your order ready to send.</small>

              <div class="hr"></div>
              <div class="row">
                <a class="btn" href="index.html">← Back to Home</a>
                <a class="btn" href="cart.html">Back to Cart</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    const form = document.getElementById("checkoutForm");

    // Toggle state
    let mode = "delivery"; // delivery | pickup
    let ctype = "individual"; // individual | business

    const applyToggles = ()=>{
      // mode buttons
      document.querySelectorAll('[data-mode]').forEach(b=> b.classList.toggle("active", b.getAttribute("data-mode")===mode));
      document.querySelectorAll('[data-type]').forEach(b=> b.classList.toggle("active", b.getAttribute("data-type")===ctype));
      const hint = document.getElementById("modeHint");
      const deliveryFields = document.getElementById("deliveryFields");
      const addr = document.getElementById("deliveryAddress");

      if(mode==="pickup"){
        if(hint) hint.textContent = "Merre porosinë (Pick-up). S’ka nevojë për adresë.";
        if(deliveryFields) deliveryFields.style.display = "none";
        if(addr){ addr.required = false; addr.value = ""; }
      }else{
        if(hint) hint.textContent = "Plotësoni adresën e transportit";
        if(deliveryFields) deliveryFields.style.display = "block";
        if(addr) addr.required = true;
      }

      const businessFields = document.getElementById("businessFields");
      if(businessFields) businessFields.style.display = (ctype==="business") ? "block" : "none";
    };

    document.querySelectorAll('[data-mode]').forEach(btn=>{
      btn.addEventListener("click", ()=>{
        mode = btn.getAttribute("data-mode");
        applyToggles();
      });
    });
    document.querySelectorAll('[data-type]').forEach(btn=>{
      btn.addEventListener("click", ()=>{
        ctype = btn.getAttribute("data-type");
        applyToggles();
      });
    });
    applyToggles();

    form.addEventListener("submit", (e)=>{
      e.preventDefault();

      const customer = {
        firstName: (document.getElementById("firstName").value || "").trim(),
        lastName: (document.getElementById("lastName").value || "").trim(),
        phone: (document.getElementById("phoneNumber").value || "").trim(),
        city: (document.getElementById("city").value || "").trim(),
        address: (document.getElementById("deliveryAddress")?.value || "").trim(),
        email: (document.getElementById("email")?.value || "").trim(),
        company: (document.getElementById("company")?.value || "").trim(),
        fiscal: (document.getElementById("fiscalNumber")?.value || "").trim(),
        notes: (document.getElementById("notes").value || "").trim(),
      };

      if(!customer.firstName || !customer.lastName || !customer.phone || !customer.city){
        toast("Please fill in all required fields.");
        return;
      }
      if(mode==="delivery" && !customer.address){
        toast("Please enter your delivery address.");
        return;
      }

      const {lines} = (function(){
        const l = [];
        for(const it of items){
          l.push(`• ${it.name} — ${it.qty} x ${moneyLocal(it.price)} = ${moneyLocal(it.line)}`);
        }
        return {lines:l};
      })();

      const msg = [
        `Hello! I want to place an order from ${BRAND.name}.`,
        ``,
        `Order items:`,
        ...lines,
        ``,
        `Total: ${moneyLocal(totalVal)}`,
        `Transport: ${deliveryWindow}`,
        ``,
        `Customer type: ${ctype === "business" ? "Business" : "Individual"}`,
        `Name: ${customer.firstName} ${customer.lastName}`,
        `Phone: ${customer.phone}`,
        `City: ${customer.city}`,
        mode==="delivery" ? `Address: ${customer.address}` : `Pickup: Yes (no delivery address)`,
        customer.email ? `Email: ${customer.email}` : null,
        (ctype==="business" && customer.company) ? `Company: ${customer.company}` : null,
        (ctype==="business" && customer.fiscal) ? `Fiscal number: ${customer.fiscal}` : null,
        customer.notes ? `Notes: ${customer.notes}` : null,
      ].filter(Boolean).join("\n");

      openWhatsApp(msg);
    });
  }



// Init
  document.addEventListener("DOMContentLoaded", ()=>{
    mountBrand();
    mountHeader();
    renderHome();
    sortCategoryOptions();
    populateCategorySelect();
    wireProductListFilters();
    window.renderProductList();
    renderProductDetail();
    renderCartPage();
    renderCategories();
    renderWishlistPage();
    renderCheckoutPage();
    // showBestSellerPopup();
    initBestSellerRail();
    // Newsletter (demo)
    const nForm = document.getElementById("newsletterForm");
    if(nForm){
      nForm.addEventListener("submit", (e)=>{
        e.preventDefault();
        const email = (document.getElementById("newsletterEmail")?.value || "").trim();
        if(!email){ toast("Please enter an email."); return; }
        try{ localStorage.setItem("hc_newsletter_email", email); }catch{}
        toast("Subscribed! (demo)");
        document.getElementById("newsletterEmail").value = "";
      });
    }

    // Scroll-to-top button
    const st = document.getElementById("scrollTopBtn");
    if(st){
      const toggle = ()=>{
        st.style.display = (window.scrollY > 300) ? "inline-flex" : "none";
      };
      window.addEventListener("scroll", toggle, {passive:true});
      toggle();
      st.addEventListener("click", ()=> window.scrollTo({top:0, behavior:"smooth"}));
    }

  });
})();