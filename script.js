
document.addEventListener("DOMContentLoaded", () => {

    let productos = [];
    let carrito = [];
    let usuarios = [];
    let ventas = [];
    let usuarioActivo = null;

    const API_URL = "https://fakestoreapi.com/products";

    const safeStorage = {
        getItem(key) {
            try {
                return localStorage.getItem(key);
            } catch (e) {
                console.warn("localStorage no accesible, usando fallback en memoria para " + key, e);
                return this.memoryStore[key] || null;
            }
        },
        setItem(key, value) {
            try {
                localStorage.setItem(key, value);
            } catch (e) {
                console.warn("localStorage no accesible, guardando en memoria para " + key, e);
                this.memoryStore[key] = String(value);
            }
        },
        removeItem(key) {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                delete this.memoryStore[key];
            }
        },
        memoryStore: {}
    };

    initApplication();

    function initApplication() {
        cargarPersistenciaLocal();
        poblarCategoriasFiltro();
        configurarNavegacionSPA();
        configurarTema();
        configurarFiltros();
        configurarFormularios();
        configurarEstadoRed();
        registrarServiceWorker();

        if (productos.length === 0) {
            fetchProductosIniciales();
        } else {
            renderizarCatalogo();
            actualizarPanelAdmin();
        }

        irAVista("landing-view");
    }

    function registrarServiceWorker() {
        if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log("Service Worker registrado con éxito: ", reg.scope))
                .catch(err => console.error("Error al registrar Service Worker: ", err));
        }
    }

    function cargarPersistenciaLocal() {
        productos = JSON.parse(safeStorage.getItem("ucab_products")) || [];
        usuarios = JSON.parse(safeStorage.getItem("ucab_users")) || [];
        ventas = JSON.parse(safeStorage.getItem("ucab_sales")) || [];
        carrito = JSON.parse(safeStorage.getItem("ucab_cart")) || [];

        if (usuarios.length === 0) {
            usuarios = [
                {
                    name: "Administrador UCAB",
                    email: "admin@ucab.com",
                    password: "admin123",
                    role: "Administrador",
                    avatar: "",
                    address: "Sede Montalbán, Caracas",
                    activo: false
                },
                {
                    name: "Cliente Prueba",
                    email: "cliente@ucab.com",
                    password: "cliente123",
                    role: "Cliente",
                    avatar: "",
                    address: "Avenida Teherán, Urb. El Paraíso",
                    activo: false
                }
            ];
            safeStorage.setItem("ucab_users", JSON.stringify(usuarios));
        }

        usuarioActivo = JSON.parse(sessionStorage.getItem("ucab_logged_user")) || null;

        actualizarInterfazUsuarioLogueado();
        actualizarContadorCarritoVisual();
    }

    function guardarProductosLocal() {
        safeStorage.setItem("ucab_products", JSON.stringify(productos));
    }

    function guardarUsuariosLocal() {
        safeStorage.setItem("ucab_users", JSON.stringify(usuarios));
    }

    function guardarVentasLocal() {
        safeStorage.setItem("ucab_sales", JSON.stringify(ventas));
    }

    function guardarCarritoLocal() {
        safeStorage.setItem("ucab_cart", JSON.stringify(carrito));
    }

    async function fetchProductosIniciales() {
        try {
            const response = await fetch(API_URL);
            const data = await response.json();

            productos = data.map(p => ({
                id: p.id,
                title: p.title,
                price: parseFloat(p.price),
                category: p.category,
                image: p.image,
                reviews: [
                    { rating: 5, comment: "Excelente producto inicial provisto por la tienda." }
                ],
                ventasCantidad: 0
            }));

            guardarProductosLocal();
            renderizarCatalogo();
            actualizarPanelAdmin();
            poblarCategoriasFiltro();
        } catch (error) {
            console.error("Error al consumir la API inicial: ", error);
        }
    }

    function configurarNavegacionSPA() {
        const mapeoBotones = {
            "btn-nav-landing": "landing-view",
            "btn-nav-catalogo": "catalog-view",
            "btn-nav-carrito": "cart-view",
            "btn-nav-auth": "auth-view",
            "btn-nav-admin": "admin-view",
            "btn-nav-perfil": "profile-view",
            "btn-cta-catalogo": "catalog-view"
        };

        Object.keys(mapeoBotones).forEach(btnId => {
            const boton = document.getElementById(btnId);
            if (boton) {
                boton.addEventListener("click", () => {
                    const vistaDestino = mapeoBotones[btnId];
                    irAVista(vistaDestino);
                });
            }
        });

        document.getElementById("btn-go-to-register").addEventListener("click", () => {
            document.getElementById("login-block").classList.add("hidden");
            document.getElementById("register-block").classList.remove("hidden");
        });

        document.getElementById("btn-go-to-login").addEventListener("click", () => {
            document.getElementById("register-block").classList.add("hidden");
            document.getElementById("login-block").classList.remove("hidden");
        });

        document.getElementById("btn-go-to-recovery").addEventListener("click", () => {
            document.getElementById("recovery-step-1").classList.remove("hidden");
            document.getElementById("recovery-step-2").classList.add("hidden");
            document.getElementById("recovery-form").reset();
            document.getElementById("reset-password-form").reset();
            irAVista("recovery-view");
        });

        document.getElementById("btn-back-to-auth").addEventListener("click", () => {
            irAVista("auth-view");
        });
    }

    function irAVista(vistaId) {

        if (vistaId === "admin-view" && (!usuarioActivo || usuarioActivo.role !== "Administrador")) {
            alert("Acceso denegado. Este panel es exclusivo para el perfil Administrador.");
            irAVista("landing-view");
            return;
        }
        if (vistaId === "cart-view" && usuarioActivo && usuarioActivo.role === "Administrador") {
            alert("Acceso denegado. Los administradores no tienen carrito de compras.");
            irAVista("admin-view");
            return;
        }
        if (vistaId === "cart-view" && !usuarioActivo) {
            alert("Para acceder al carrito de compras, debes registrarte o iniciar sesión.");
            irAVista("auth-view");
            return;
        }
        if (vistaId === "profile-view" && !usuarioActivo) {
            irAVista("auth-view");
            return;
        }

        const secciones = document.querySelectorAll("main > section");
        secciones.forEach(sec => sec.classList.add("hidden"));

        const seccionObjetivo = document.getElementById(vistaId);
        if (seccionObjetivo) seccionObjetivo.classList.remove("hidden");

        if (vistaId === "catalog-view") renderizarCatalogo();
        if (vistaId === "cart-view") renderizarCarrito();
        if (vistaId === "admin-view") actualizarPanelAdmin();
        if (vistaId === "landing-view") renderizarCatalogo();
    }

    function configurarFormularios() {

        document.getElementById("btn-logout").addEventListener("click", () => {
            if (usuarioActivo) {
                const uLocal = usuarios.find(u => u.email === usuarioActivo.email);
                if (uLocal) uLocal.activo = false;
                guardarUsuariosLocal();
            }
            usuarioActivo = null;
            sessionStorage.removeItem("ucab_logged_user");
            actualizarInterfazUsuarioLogueado();
            actualizarPanelAdmin();
            alert("Sesión finalizada.");
            irAVista("landing-view");
        });

        document.getElementById("register-form").addEventListener("submit", (e) => {
            e.preventDefault();
            const email = document.getElementById("reg-email").value;

            if (usuarios.some(u => u.email === email)) {
                alert("Esta dirección de correo electrónico ya se encuentra registrada.");
                return;
            }

            const nuevoUsuario = {
                name: document.getElementById("reg-name").value,
                email: email,
                password: document.getElementById("reg-password").value,
                role: document.getElementById("reg-role").value,
                avatar: "",
                address: "",
                activo: false
            };

            usuarios.push(nuevoUsuario);
            guardarUsuariosLocal();
            alert("Cuenta registrada con éxito. Ya puedes iniciar sesión.");
            document.getElementById("register-form").reset();
            document.getElementById("btn-go-to-login").click();
            actualizarPanelAdmin();
        });

        document.getElementById("login-form").addEventListener("submit", (e) => {
            e.preventDefault();
            const email = document.getElementById("login-email").value;
            const pass = document.getElementById("login-password").value;

            const usuarioFound = usuarios.find(u => u.email === email && u.password === pass);

            if (usuarioFound) {
                usuarioFound.activo = true;
                usuarioActivo = usuarioFound;
                sessionStorage.setItem("ucab_logged_user", JSON.stringify(usuarioActivo));
                guardarUsuariosLocal();

                alert(`Autenticado como: ${usuarioActivo.name} (${usuarioActivo.role})`);
                document.getElementById("login-form").reset();
                actualizarInterfazUsuarioLogueado();
                actualizarPanelAdmin();
                if (usuarioActivo.role === "Administrador") {
                    irAVista("admin-view");
                } else {
                    irAVista("catalog-view");
                }
            } else {
                alert("Las credenciales provistas no coinciden con nuestros registros.");
            }
        });

        let recoveryEmailTemp = "";
        document.getElementById("recovery-form").addEventListener("submit", (e) => {
            e.preventDefault();
            const email = document.getElementById("recovery-email").value;
            const userExists = usuarios.find(u => u.email === email);
            if (userExists) {
                recoveryEmailTemp = email;
                document.getElementById("recovery-validated-email").innerText = email;
                document.getElementById("recovery-step-1").classList.add("hidden");
                document.getElementById("recovery-step-2").classList.remove("hidden");
            } else {
                alert("Esta dirección de correo electrónico no está registrada en el sistema.");
            }
        });

        document.getElementById("reset-password-form").addEventListener("submit", (e) => {
            e.preventDefault();
            const newPass = document.getElementById("new-password").value;
            const confirmNewPass = document.getElementById("confirm-new-password").value;

            if (newPass !== confirmNewPass) {
                alert("Las contraseñas ingresadas no coinciden.");
                return;
            }

            const userIdx = usuarios.findIndex(u => u.email === recoveryEmailTemp);
            if (userIdx !== -1) {
                usuarios[userIdx].password = newPass;
                guardarUsuariosLocal();
                alert("Contraseña restablecida con éxito. Ya puedes iniciar sesión con tus nuevas credenciales.");
                document.getElementById("recovery-step-2").classList.add("hidden");
                document.getElementById("recovery-step-1").classList.remove("hidden");
                document.getElementById("recovery-form").reset();
                document.getElementById("reset-password-form").reset();
                irAVista("auth-view");
            } else {
                alert("Error al restablecer la contraseña. Inténtelo de nuevo.");
            }
        });

        document.getElementById("profile-form").addEventListener("submit", (e) => {
            e.preventDefault();
            if (!usuarioActivo) return;

            usuarioActivo.name = document.getElementById("prof-name").value;
            usuarioActivo.avatar = document.getElementById("prof-avatar").value;
            usuarioActivo.address = document.getElementById("prof-address").value;

            const idx = usuarios.findIndex(u => u.email === usuarioActivo.email);
            if (idx !== -1) usuarios[idx] = usuarioActivo;

            sessionStorage.setItem("ucab_logged_user", JSON.stringify(usuarioActivo));
            guardarUsuariosLocal();
            actualizarInterfazUsuarioLogueado();
            alert("Cambios guardados localmente.");
        });

        const profAvatarInput = document.getElementById("prof-avatar");
        if (profAvatarInput) {
            profAvatarInput.addEventListener("input", (e) => {
                const url = e.target.value;
                const imgPreview = document.getElementById("profile-avatar-preview");
                const placeholder = document.getElementById("profile-avatar-placeholder");
                if (imgPreview && placeholder) {
                    if (url) {
                        imgPreview.src = url;
                        imgPreview.style.display = "inline-block";
                        placeholder.style.display = "none";
                        imgPreview.onerror = () => {
                            imgPreview.style.display = "none";
                            placeholder.style.display = "flex";
                        };
                    } else {
                        imgPreview.style.display = "none";
                        placeholder.style.display = "flex";
                    }
                }
            });
        }

        document.getElementById("crud-product-form").addEventListener("submit", (e) => {
            e.preventDefault();
            const idHidden = document.getElementById("crud-product-id").value;
            const titulo = document.getElementById("crud-title").value;
            const precio = parseFloat(document.getElementById("crud-price").value);
            const categoria = document.getElementById("crud-category").value;
            const imagen = document.getElementById("crud-image").value;

            if (idHidden) {

                const prod = productos.find(p => p.id == idHidden);
                if (prod) {
                    prod.title = titulo;
                    prod.price = precio;
                    prod.category = categoria;
                    prod.image = imagen;
                    alert("Producto modificado correctamente.");
                }
            } else {

                const nuevoProd = {
                    id: productos.length > 0 ? Math.max(...productos.map(p => p.id)) + 1 : 1,
                    title: titulo,
                    price: precio,
                    category: categoria,
                    image: imagen,
                    reviews: [],
                    ventasCantidad: 0
                };
                productos.push(nuevoProd);
                alert("Nuevo producto añadido al inventario.");
            }

            guardarProductosLocal();
            document.getElementById("crud-product-form").reset();
            document.getElementById("crud-product-id").value = "";
            document.getElementById("crud-form-title").innerText = "Guardar Producto";
            renderizarCatalogo();
            actualizarPanelAdmin();
            poblarCategoriasFiltro();
        });

        document.getElementById("checkout-form").addEventListener("submit", (e) => {
            e.preventDefault();
            procesarCheckoutOrden();
        });

        const newsletterForm = document.getElementById("newsletter-form");
        if (newsletterForm) {
            newsletterForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const email = document.getElementById("newsletter-email").value;
                alert(`¡Gracias por suscribirte con: ${email}! Te mantendremos informado.`);
                newsletterForm.reset();
            });
        }

        const cardInput = document.getElementById("card-number");
        if (cardInput) {
            cardInput.addEventListener("input", (e) => {
                let val = e.target.value.replace(/\D/g, "");
                e.target.value = val;

                const badge = document.getElementById("card-brand-badge");
                if (!badge) return;

                const brand = detectarMarcaTarjeta(val);
                if (brand === "visa") {
                    badge.innerText = "Visa";
                    badge.className = "visa";
                    badge.style.display = "inline-block";
                } else if (brand === "mastercard") {
                    badge.innerText = "Mastercard";
                    badge.className = "mastercard";
                    badge.style.display = "inline-block";
                } else {
                    badge.innerText = "";
                    badge.className = "";
                    badge.style.display = "none";
                }
            });
        }
    }

    function actualizarInterfazUsuarioLogueado() {
        const btnAuth = document.getElementById("btn-nav-auth");
        const btnAdmin = document.getElementById("btn-nav-admin");
        const btnPerfil = document.getElementById("btn-nav-perfil");
        const btnCarrito = document.getElementById("btn-nav-carrito");

        if (usuarioActivo) {
            if (btnAuth) btnAuth.parentElement.classList.add("hidden");
            if (btnPerfil) btnPerfil.classList.remove("hidden");

            document.getElementById("prof-name").value = usuarioActivo.name || "";
            document.getElementById("prof-avatar").value = usuarioActivo.avatar || "";
            document.getElementById("prof-address").value = usuarioActivo.address || "";

            const imgPreview = document.getElementById("profile-avatar-preview");
            const placeholder = document.getElementById("profile-avatar-placeholder");
            if (imgPreview && placeholder) {
                if (usuarioActivo.avatar) {
                    imgPreview.src = usuarioActivo.avatar;
                    imgPreview.style.display = "inline-block";
                    placeholder.style.display = "none";
                    imgPreview.onerror = () => {
                        imgPreview.style.display = "none";
                        placeholder.style.display = "flex";
                    };
                } else {
                    imgPreview.style.display = "none";
                    placeholder.style.display = "flex";
                }
            }

            if (usuarioActivo.role === "Administrador") {
                if (btnAdmin) btnAdmin.classList.remove("hidden");
                if (btnCarrito) btnCarrito.parentElement.classList.add("hidden");
            } else {
                if (btnAdmin) btnAdmin.classList.add("hidden");
                if (btnCarrito) btnCarrito.parentElement.classList.remove("hidden");
            }
        } else {
            if (btnAuth) {
                btnAuth.innerText = "Iniciar Sesión / Registro";
                btnAuth.parentElement.classList.remove("hidden");
            }
            if (btnAdmin) btnAdmin.classList.add("hidden");
            if (btnPerfil) btnPerfil.classList.add("hidden");
            if (btnCarrito) btnCarrito.parentElement.classList.add("hidden");
        }
    }

    function configurarFiltros() {
        document.getElementById("search-input").addEventListener("input", renderizarCatalogo);
        document.getElementById("category-filter").addEventListener("change", renderizarCatalogo);
        document.getElementById("min-price").addEventListener("input", renderizarCatalogo);
        document.getElementById("max-price").addEventListener("input", renderizarCatalogo);
    }

    function poblarCategoriasFiltro() {
        const select = document.getElementById("category-filter");
        select.innerHTML = '<option value="all">Todas</option>';

        const categoriasUnicas = [...new Set(productos.map(p => p.category))];
        categoriasUnicas.forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat;
            opt.innerText = cat;
            select.appendChild(opt);
        });
    }

    function renderizarCatalogo() {
        const container = document.getElementById("products-container");
        const destacadosContainer = document.getElementById("destacados-container");
        if (!container) return;

        container.innerHTML = "";

        const busqueda = document.getElementById("search-input").value.toLowerCase();
        const categoriaSel = document.getElementById("category-filter").value;
        const minP = parseFloat(document.getElementById("min-price").value) || 0;
        const maxP = parseFloat(document.getElementById("max-price").value) || Infinity;

        const productosFiltrados = productos.filter(p => {
            const matchesBusqueda = p.title.toLowerCase().includes(busqueda);
            const matchesCategoria = (categoriaSel === "all" || p.category === categoriaSel);
            const matchesPrecio = (p.price >= minP && p.price <= maxP);
            return matchesBusqueda && matchesCategoria && matchesPrecio;
        });

        productosFiltrados.forEach(p => {
            const card = document.createElement("div");
            card.className = "product-card";

            const promedioEstrellas = p.reviews.length > 0
                ? (p.reviews.reduce((acc, r) => acc + r.rating, 0) / p.reviews.length).toFixed(1)
                : "Sin calificaciones";

            let htmlContenido = `
                <img src="${p.image || 'https://via.placeholder.com/150'}" alt="${p.title}">
                <h4>${p.title}</h4>
                <p><small>${p.category}</small></p>
                <p class="price">$${p.price.toFixed(2)}</p>
                <div class="rating-box">★ ${promedioEstrellas} (${p.reviews.length} reseñas)</div>
            `;

            if (!usuarioActivo || usuarioActivo.role === "Cliente") {
                htmlContenido += `
                    <button class="btn-agregar-carrito" data-id="${p.id}">Agregar al Carrito</button>

                    <div class="feedback-subblock">
                        <hr style="margin: 0.5rem 0; border: 0; border-top: 1px dashed var(--border-color);">
                        <label><small>Calificar:</small></label>
                        <select class="select-rating" data-id="${p.id}" style="padding:0.2rem; margin-bottom:0.3rem;">
                            <option value="5">5 Estrellas</option>
                            <option value="4">4 Estrellas</option>
                            <option value="3">3 Estrellas</option>
                            <option value="2">2 Estrellas</option>
                            <option value="1">1 Estrella</option>
                        </select>
                        <input type="text" class="input-comment" data-id="${p.id}" placeholder="Escribe tu comentario..." style="padding:0.3rem; margin-bottom:0.3rem; font-size:0.8rem;">
                        <button class="btn-submit-review" data-id="${p.id}" style="padding:0.3rem; font-size:0.8rem; width:100%;">Enviar Reseña</button>
                    </div>
                `;
            } else if (usuarioActivo && usuarioActivo.role === "Administrador") {
                htmlContenido += `
                    <div style="background-color: rgba(112, 146, 85, 0.1); padding: 0.75rem; border-radius: var(--radius); margin-top: 0.5rem; text-align: center;">
                        <p style="font-size: 0.8rem; font-weight: bold; margin-bottom: 0.5rem; color: var(--primary);">Herramientas CRUD Admin</p>
                        <button class="btn-quick-edit btn-secondary" data-id="${p.id}" style="padding:0.4rem; font-size:0.8rem; width:48%; margin-right:2%;">Editar</button>
                        <button class="btn-quick-delete btn-danger" data-id="${p.id}" style="padding:0.4rem; font-size:0.8rem; width:48%;">Eliminar</button>
                    </div>
                `;
            }

            htmlContenido += `
                <div class="comments-box">
                    ${p.reviews.map(r => `<div><strong>${r.autor || 'Anónimo'}</strong> (★${r.rating}): ${r.comment}</div>`).join("")}
                </div>
            `;

            card.innerHTML = htmlContenido;
            container.appendChild(card);
        });

        experimentalBindingCatalogEvents();

        if (destacadosContainer) {
            destacadosContainer.innerHTML = "";
            const mejoresProductos = [...productos]
                .sort((a, b) => {
                    const avgA = a.reviews.reduce((acc, r) => acc + r.rating, 0) / (a.reviews.length || 1);
                    const avgB = b.reviews.reduce((acc, r) => acc + r.rating, 0) / (b.reviews.length || 1);
                    return avgB - avgA;
                })
                .slice(0, 3);

            mejoresProductos.forEach(p => {
                const dItem = document.createElement("div");
                dItem.className = "product-card";
                dItem.innerHTML = `
                    <img src="${p.image}" alt="${p.title}" style="height:100px; object-fit:contain;">
                    <h5>${p.title}</h5>
                    <p class="price">$${p.price.toFixed(2)}</p>
                `;
                destacadosContainer.appendChild(dItem);
            });
        }
    }

    function experimentalBindingCatalogEvents() {
        document.querySelectorAll(".btn-agregar-carrito").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const pId = parseInt(e.target.getAttribute("data-id"));
                agregarAlCarrito(pId);
            });
        });

        document.querySelectorAll(".btn-submit-review").forEach(btn => {
            btn.addEventListener("click", (e) => {
                if (!usuarioActivo) {
                    alert("Para enviar una reseña, debes registrarte o iniciar sesión.");
                    irAVista("auth-view");
                    return;
                }
                const pId = parseInt(e.target.getAttribute("data-id"));
                const rating = parseInt(document.querySelector(`.select-rating[data-id="${pId}"]`).value);
                const commentInput = document.querySelector(`.input-comment[data-id="${pId}"]`);
                const comment = commentInput.value;

                if(!comment.trim()) { alert("Por favor, ingresa un comentario válido."); return; }

                const prod = productos.find(p => p.id === pId);
                if (prod) {
                    const autor = usuarioActivo ? usuarioActivo.name : "Invitado";
                    prod.reviews.push({ rating, comment, autor });
                    guardarProductosLocal();
                    alert("Reseña agregada de manera local.");
                    commentInput.value = "";
                    renderizarCatalogo();
                }
            });
        });

        document.querySelectorAll(".btn-quick-edit").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const id = parseInt(e.target.getAttribute("data-id"));
                irAVista("admin-view");

                const prod = productos.find(p => p.id === id);
                if (prod) {
                    document.getElementById("crud-product-id").value = prod.id;
                    document.getElementById("crud-title").value = prod.title;
                    document.getElementById("crud-price").value = prod.price;
                    document.getElementById("crud-category").value = prod.category;
                    document.getElementById("crud-image").value = prod.image;
                    document.getElementById("crud-form-title").innerText = `Modificando Producto ID: ${prod.id}`;
                }
            });
        });

        document.querySelectorAll(".btn-quick-delete").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const id = parseInt(e.target.getAttribute("data-id"));
                if (confirm(`¿Proceder con la eliminación física del ítem ID ${id}?`)) {
                    productos = productos.filter(p => p.id !== id);
                    guardarProductosLocal();
                    renderizarCatalogo();
                    actualizarPanelAdmin();
                    poblarCategoriasFiltro();
                }
            });
        });
    }

    function agregarAlCarrito(id) {
        if (!usuarioActivo) {
            alert("Para agregar productos al carrito y realizar compras, debes registrarte o iniciar sesión.");
            irAVista("auth-view");
            return;
        }
        const prod = productos.find(p => p.id === id);
        if (!prod) return;

        const itemEnCarrito = carrito.find(item => item.id === id);
        if (itemEnCarrito) {
            itemEnCarrito.cantidad += 1;
        } else {
            carrito.push({
                id: prod.id,
                title: prod.title,
                price: prod.price,
                cantidad: 1
            });
        }
        guardarCarritoLocal();
        actualizarContadorCarritoVisual();
        alert(`${prod.title} añadido.`);
    }

    function actualizarContadorCarritoVisual() {
        const totalItems = carrito.reduce((acc, item) => acc + item.cantidad, 0);
        document.getElementById("cart-count").innerText = totalItems;
    }

    function renderizarCarrito() {
        const listContainer = document.getElementById("cart-items-list");
        if (!listContainer) return;

        listContainer.innerHTML = "";
        let subtotal = 0;

        if (carrito.length === 0) {
            listContainer.innerHTML = "<p>El carrito se encuentra vacío.</p>";
        } else {
            carrito.forEach(item => {
                const itemCost = item.price * item.cantidad;
                subtotal += itemCost;

                const div = document.createElement("div");
                div.style.borderBottom = "1px solid var(--border-color)";
                div.style.padding = "1rem 0";
                div.innerHTML = `
                    <p><strong>${item.title}</strong> - $${item.price.toFixed(2)} x ${item.cantidad} (Sub: $${itemCost.toFixed(2)})</p>
                    <button class="btn-cart-add" data-id="${item.id}"> + </button>
                    <button class="btn-cart-rest" data-id="${item.id}"> - </button>
                    <button class="btn-cart-clone btn-secondary" data-id="${item.id}" style="padding:0.2rem 0.5rem; font-size:0.8rem;"> Clonar </button>
                    <button class="btn-cart-del btn-danger" data-id="${item.id}" style="padding:0.2rem 0.5rem; font-size:0.8rem;"> Eliminar </button>
                `;
                listContainer.appendChild(div);
            });
        }

        document.getElementById("cart-subtotal").innerText = subtotal.toFixed(2);
        document.getElementById("cart-total").innerText = subtotal.toFixed(2);

        document.querySelectorAll(".btn-cart-add").forEach(b => b.addEventListener("click", (e) => {
            const id = parseInt(e.target.getAttribute("data-id"));
            carrito.find(i => i.id === id).cantidad += 1;
            guardarCarritoLocal(); actualizarContadorCarritoVisual(); renderizarCarrito();
        }));

        document.querySelectorAll(".btn-cart-rest").forEach(b => b.addEventListener("click", (e) => {
            const id = parseInt(e.target.getAttribute("data-id"));
            const item = carrito.find(i => i.id === id);
            if (item.cantidad > 1) {
                item.cantidad -= 1;
            } else {
                carrito = carrito.filter(i => i.id !== id);
            }
            guardarCarritoLocal(); actualizarContadorCarritoVisual(); renderizarCarrito();
        }));

        document.querySelectorAll(".btn-cart-clone").forEach(b => b.addEventListener("click", (e) => {
            const id = parseInt(e.target.getAttribute("data-id"));
            const item = carrito.find(i => i.id === id);
            if (item) {
                item.cantidad *= 2;
                guardarCarritoLocal();
                actualizarContadorCarritoVisual();
                renderizarCarrito();
                alert(`Cantidad de ${item.title} duplicada (clonada).`);
            }
        }));

        document.querySelectorAll(".btn-cart-del").forEach(b => b.addEventListener("click", (e) => {
            const id = parseInt(e.target.getAttribute("data-id"));
            carrito = carrito.filter(i => i.id !== id);
            guardarCarritoLocal(); actualizarContadorCarritoVisual(); renderizarCarrito();
        }));
    }

    function configurarEstadoRed() {
        window.addEventListener("online", procesarColaOfflineSincronizacion);
        window.addEventListener("offline", () => {
            const ind = document.getElementById("status-text");
            if (ind) {
                ind.innerText = "Offline";
                ind.style.color = "var(--accent-danger)";
            }
        });

        if (!navigator.onLine) {
            const ind = document.getElementById("status-text");
            if (ind) {
                ind.innerText = "Offline";
                ind.style.color = "var(--accent-danger)";
            }
        } else {
            procesarColaOfflineSincronizacion();
        }
    }

    function procesarCheckoutOrden() {
        if (carrito.length === 0) {
            alert("No hay elementos para procesar en la pasarela de pago.");
            return;
        }

        const cardNumber = document.getElementById("card-number").value.replace(/\D/g, "");
        const cardExpiry = document.getElementById("card-expiry").value;
        const cardCvv = document.getElementById("card-cvv").value.replace(/\D/g, "");

        if (cardNumber.length !== 16) {
            alert("El número de tarjeta debe tener exactamente 16 dígitos.");
            return;
        }

        if (cardCvv.length !== 3) {
            alert("El CVV debe tener exactamente 3 dígitos.");
            return;
        }

        if (cardExpiry) {
            const hoy = new Date();
            const [expYear, expMonth] = cardExpiry.split("-").map(Number);
            const expLastDay = new Date(expYear, expMonth, 0, 23, 59, 59);

            if (expLastDay < hoy) {
                alert("La tarjeta ingresada se encuentra vencida.");
                return;
            }
        } else {
            alert("Debe ingresar la fecha de vencimiento de su tarjeta.");
            return;
        }

        const totalFacturado = carrito.reduce((acc, i) => acc + (i.price * i.cantidad), 0);
        const nuevaOrden = {
            idOrden: ventas.length > 0 ? Math.max(...ventas.map(v => v.idOrden)) + 1 : 1001,
            cliente: usuarioActivo ? usuarioActivo.name : "Usuario Invitado",
            total: totalFacturado,
            estadoEnvio: "Pendiente",
            itemsComprados: [...carrito]
        };

        if (navigator.onLine) {
            registrarVentaEfectiva(nuevaOrden);
            alert("Compra procesada con éxito a través de la pasarela simulada.");
        } else {
            let colaOffline = JSON.parse(safeStorage.getItem("ucab_offline_queue")) || [];
            colaOffline.push(nuevaOrden);
            safeStorage.setItem("ucab_offline_queue", JSON.stringify(colaOffline));
            alert("Aplicación operando sin conexión. La orden ha sido encolada para su procesamiento automático al recuperar la conectividad.");
        }

        const chkForm = document.getElementById("checkout-form");
        if (chkForm) chkForm.reset();
        const badge = document.getElementById("card-brand-badge");
        if (badge) {
            badge.innerText = "";
            badge.className = "";
            badge.style.display = "none";
        }

        carrito = [];
        guardarCarritoLocal();
        actualizarContadorCarritoVisual();
        renderizarCarrito();
        actualizarPanelAdmin();
    }

    function registrarVentaEfectiva(orden) {
        ventas.push(orden);
        guardarVentasLocal();

        orden.itemsComprados.forEach(item => {
            const pOrig = productos.find(p => p.id === item.id);
            if (pOrig) {
                pOrig.ventasCantidad = (pOrig.ventasCantidad || 0) + item.cantidad;
            }
        });
        guardarProductosLocal();
    }

    function procesarColaOfflineSincronizacion() {
        const ind = document.getElementById("status-text");
        if (ind) {
            ind.innerText = "Online";
            ind.style.color = "var(--accent)";
        }

        let colaOffline = JSON.parse(safeStorage.getItem("ucab_offline_queue")) || [];
        if (colaOffline.length > 0) {
            colaOffline.forEach(orden => {
                orden.idOrden = ventas.length > 0 ? Math.max(...ventas.map(v => v.idOrden)) + 1 : 1001;
                registrarVentaEfectiva(orden);
            });
            safeStorage.removeItem("ucab_offline_queue");
            alert(`Sincronización exitosa: ${colaOffline.length} órdenes procesadas automáticamente.`);
            actualizarPanelAdmin();
        }
    }

    function actualizarPanelAdmin() {
        if (!document.getElementById("admin-view")) return;

        const totalIngresos = ventas.reduce((acc, v) => acc + v.total, 0);
        document.getElementById("metric-revenue").innerText = totalIngresos.toFixed(2);

        const totalRegistrados = usuarios.length;
        const totalActivos = usuarios.filter(u => u.activo === true).length + (usuarioActivo ? 1 : 0);
        document.getElementById("metric-registered-users").innerText = totalRegistrados;
        document.getElementById("metric-active-users").innerText = totalActivos;

        const top3Chart = document.getElementById("metric-top-products-chart");
        top3Chart.innerHTML = "";
        const productosOrdenadosPorVenta = [...productos]
            .filter(p => p.ventasCantidad > 0)
            .sort((a, b) => b.ventasCantidad - a.ventasCantidad)
            .slice(0, 3);

        if (productosOrdenadosPorVenta.length === 0) {
            top3Chart.innerHTML = "<p style='font-style: italic; font-size:0.9rem;'>Aún no se registran transacciones.</p>";
        } else {
            const maxVentas = productosOrdenadosPorVenta[0].ventasCantidad;
            productosOrdenadosPorVenta.forEach(p => {
                const porcentaje = (p.ventasCantidad / maxVentas) * 100;
                const barWrapper = document.createElement("div");
                barWrapper.className = "chart-bar-wrapper";
                barWrapper.innerHTML = `
                    <div class="chart-bar-label">
                        <span class="chart-bar-title">${p.title}</span>
                        <span class="chart-bar-count">${p.ventasCantidad} u.</span>
                    </div>
                    <div class="chart-bar-outer">
                        <div class="chart-bar-inner" style="width: ${porcentaje}%;"></div>
                    </div>
                `;
                top3Chart.appendChild(barWrapper);
            });
        }

        const tbodyInv = document.querySelector("#products-table tbody");
        tbodyInv.innerHTML = "";
        productos.forEach(p => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${p.id}</td>
                <td><strong>${p.title}</strong></td>
                <td>${p.category}</td>
                <td>$${p.price.toFixed(2)}</td>
                <td>
                    <button class="btn-crud-edit btn-secondary" data-id="${p.id}" style="padding:0.2rem 0.5rem; font-size:0.8rem;">Editar</button>
                    <button class="btn-crud-delete btn-danger" data-id="${p.id}" style="padding:0.2rem 0.5rem; font-size:0.8rem;">Eliminar</button>
                </td>
            `;
            tbodyInv.appendChild(tr);
        });

        const tbodySales = document.querySelector("#sales-table tbody");
        tbodySales.innerHTML = "";
        ventas.forEach(v => {
            const tr = document.createElement("tr");

            let badgeClass = "";
            if (v.estadoEnvio === "Pendiente") badgeClass = "badge-pending";
            else if (v.estadoEnvio === "Enviado") badgeClass = "badge-sent";
            else if (v.estadoEnvio === "Entregado") badgeClass = "badge-delivered";

            tr.innerHTML = `
                <td>#${v.idOrden}</td>
                <td>${v.cliente}</td>
                <td>$${v.total.toFixed(2)}</td>
                <td>
                    <span class="status-badge ${badgeClass}">
                        <select class="select-change-status" data-id="${v.idOrden}">
                            <option value="Pendiente" ${v.estadoEnvio === "Pendiente" ? "selected" : ""}>Pendiente</option>
                            <option value="Enviado" ${v.estadoEnvio === "Enviado" ? "selected" : ""}>Enviado</option>
                            <option value="Entregado" ${v.estadoEnvio === "Entregado" ? "selected" : ""}>Entregado</option>
                        </select>
                    </span>
                </td>
            `;
            tbodySales.appendChild(tr);
        });

        bindingAdminActionsEvents();
    }

    function bindingAdminActionsEvents() {
        document.getElementById("btn-create-product").onclick = () => {
            document.getElementById("crud-product-form").reset();
            document.getElementById("crud-product-id").value = "";
            document.getElementById("crud-form-title").innerText = "Registrar Nuevo Producto";
            document.getElementById("crud-title").focus();
        };

        document.querySelectorAll(".btn-crud-edit").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const id = parseInt(e.target.getAttribute("data-id"));
                const prod = productos.find(p => p.id === id);
                if (prod) {
                    document.getElementById("crud-product-id").value = prod.id;
                    document.getElementById("crud-title").value = prod.title;
                    document.getElementById("crud-price").value = prod.price;
                    document.getElementById("crud-category").value = prod.category;
                    document.getElementById("crud-image").value = prod.image;

                    document.getElementById("crud-form-title").innerText = `Modificando Producto ID: ${prod.id}`;
                    document.getElementById("crud-title").focus();
                }
            });
        });

        document.querySelectorAll(".btn-crud-delete").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const id = parseInt(e.target.getAttribute("data-id"));
                if (confirm(`¿Proceder con la eliminación física del ítem ID ${id}?`)) {
                    productos = productos.filter(p => p.id !== id);
                    guardarProductosLocal();
                    renderizarCatalogo();
                    actualizarPanelAdmin();
                    poblarCategoriasFiltro();
                }
            });
        });

        document.querySelectorAll(".select-change-status").forEach(select => {
            select.addEventListener("change", (e) => {
                const orderId = parseInt(e.target.getAttribute("data-id"));
                const nuevoEstado = e.target.value;
                const orden = ventas.find(v => v.idOrden === orderId);
                if (orden) {
                    orden.estadoEnvio = nuevoEstado;
                    guardarVentasLocal();
                    alert(`Orden N° ${orderId} actualizada al estado: ${nuevoEstado}`);
                }
            });
        });
    }

    function configurarTema() {
        const toggleBtn = document.getElementById("theme-toggle");
        if (!toggleBtn) return;

        const temaGuardado = safeStorage.getItem("ucab_theme") || "light";
        document.documentElement.setAttribute("data-theme", temaGuardado);
        actualizarTextoBotonTema(toggleBtn, temaGuardado);

        toggleBtn.addEventListener("click", () => {
            const temaActual = document.documentElement.getAttribute("data-theme");
            const nuevoTema = temaActual === "dark" ? "light" : "dark";

            document.documentElement.setAttribute("data-theme", nuevoTema);
            safeStorage.setItem("ucab_theme", nuevoTema);
            actualizarTextoBotonTema(toggleBtn, nuevoTema);
        });
    }

    function actualizarTextoBotonTema(btn, tema) {
        if (tema === "dark") {
            btn.innerHTML = "Modo Claro";
        } else {
            btn.innerHTML = "Modo Oscuro";
        }
    }

    function validarLuhn(numero) {
        let sum = 0;
        let shouldDouble = false;
        for (let i = numero.length - 1; i >= 0; i--) {
            let digit = parseInt(numero.charAt(i));

            if (shouldDouble) {
                if ((digit *= 2) > 9) digit -= 9;
            }

            sum += digit;
            shouldDouble = !shouldDouble;
        }
        return (sum % 10) === 0;
    }

    function detectarMarcaTarjeta(numero) {
        if (numero.startsWith("4")) {
            return "visa";
        } else if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[0-1]|2720)/.test(numero)) {
            return "mastercard";
        }
        return "unknown";
    }
});