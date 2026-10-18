
"use strict";

/* ==========================================
   CONFIGURACIÓN Y PUBLICACIÓN DE PRODUCTOS
========================================== */

let cargandoFormularioProducto = false;
let productosCatalogo = [];
let categoriaActiva = "Todos";
let textoBusquedaProducto = "";

// Comprobar que Supabase esté disponible.
function obtenerSupabase() {
    if (
        typeof supabaseClient === "undefined" ||
        !supabaseClient
    ) {
        throw new Error("No se pudo conectar con Supabase.");
    }

    return supabaseClient;
}

// Abrir el formulario de publicación.
async function abrirFormularioProducto() {
    if (cargandoFormularioProducto) return;

    let modal = document.getElementById("modalProducto");

    if (modal) {
        modal.style.display = "flex";
        return;
    }

    cargandoFormularioProducto = true;

    try {
        const cliente = obtenerSupabase();

        const { data, error } =
            await cliente.auth.getSession();

        if (error) throw error;

        const usuario = data.session?.user;

        if (!usuario) {
            alert("Primero debes iniciar sesión.");
            return;
        }

        const { data: tienda, error: errorTienda } =
            await cliente
                .from("tiendas")
                .select("id")
                .eq("usuario_id", usuario.id)
                .maybeSingle();

        if (errorTienda) throw errorTienda;

        if (!tienda) {
            alert("Primero debes crear tu tienda.");
            return;
        }

        const respuesta = await fetch(
            "componentes/producto.html"
        );

        if (!respuesta.ok) {
            throw new Error(
                "No se encontró componentes/producto.html."
            );
        }

        modal = document.createElement("div");
        modal.id = "modalProducto";
        modal.className = "modal";
        modal.innerHTML = await respuesta.text();

        document.body.appendChild(modal);

        modal.querySelector("#cerrarProducto")
            ?.addEventListener(
                "click",
                cerrarFormularioProducto
            );

        modal.addEventListener("click", evento => {
            if (evento.target === modal) {
                cerrarFormularioProducto();
            }
        });

        modal.querySelector("#formularioProducto")
            ?.addEventListener(
                "submit",
                guardarProducto
            );

        // Vista previa de la fotografía.
        const campoImagen =
            modal.querySelector("#imagenProducto");

        const vistaPrevia =
            modal.querySelector("#vistaPreviaProducto");

        campoImagen?.addEventListener("change", () => {
            const archivo = campoImagen.files?.[0];

            if (!archivo) {
                if (vistaPrevia) {
                    vistaPrevia.hidden = true;
                    vistaPrevia.removeAttribute("src");
                }
                return;
            }

            const formatosPermitidos = [
                "image/jpeg",
                "image/png",
                "image/webp"
            ];

            if (!formatosPermitidos.includes(archivo.type)) {
                alert(
                    "Selecciona una imagen JPG, PNG o WebP."
                );

                campoImagen.value = "";

                if (vistaPrevia) {
                    vistaPrevia.hidden = true;
                    vistaPrevia.removeAttribute("src");
                }

                return;
            }

            if (archivo.size > 5 * 1024 * 1024) {
                alert(
                    "La fotografía no debe superar los 5 MB."
                );

                campoImagen.value = "";

                if (vistaPrevia) {
                    vistaPrevia.hidden = true;
                    vistaPrevia.removeAttribute("src");
                }

                return;
            }

            if (vistaPrevia) {
                if (vistaPrevia.dataset.urlTemporal) {
                    URL.revokeObjectURL(
                        vistaPrevia.dataset.urlTemporal
                    );
                }

                const urlTemporal =
                    URL.createObjectURL(archivo);

                vistaPrevia.src = urlTemporal;
                vistaPrevia.dataset.urlTemporal =
                    urlTemporal;

                vistaPrevia.hidden = false;
            }
        });

        modal.style.display = "flex";

    } catch (error) {
        console.error(
            "Error al abrir el formulario:",
            error
        );

        alert(
            error.message ||
            "No se pudo abrir el formulario."
        );

    } finally {
        cargandoFormularioProducto = false;
    }
}

// Cerrar el formulario de publicación.
function cerrarFormularioProducto() {
    const modal = document.getElementById("modalProducto");

    if (modal) {
        const vistaPrevia =
            modal.querySelector("#vistaPreviaProducto");

        if (vistaPrevia?.dataset.urlTemporal) {
            URL.revokeObjectURL(
                vistaPrevia.dataset.urlTemporal
            );

            delete vistaPrevia.dataset.urlTemporal;
        }

        modal.style.display = "none";
    }
}

// Subir una fotografía al almacenamiento de Supabase.
async function subirImagenProducto(archivo, usuarioId) {
    const cliente = obtenerSupabase();

    const extensiones = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp"
    };

    if (!archivo || !extensiones[archivo.type]) {
        throw new Error(
            "El formato de la imagen no es válido."
        );
    }

    if (archivo.size > 5 * 1024 * 1024) {
        throw new Error(
            "La imagen no debe superar los 5 MB."
        );
    }

    const nombreArchivo =
        `${usuarioId}/${crypto.randomUUID()}.` +
        extensiones[archivo.type];

    const { error } = await cliente.storage
        .from("imagenes-productos")
        .upload(nombreArchivo, archivo, {
            contentType: archivo.type,
            upsert: false
        });

    if (error) throw error;

    const { data } = cliente.storage
        .from("imagenes-productos")
        .getPublicUrl(nombreArchivo);

    return data.publicUrl;
}

// Publicar el producto.
async function guardarProducto(evento) {
    evento.preventDefault();

    const formulario =
        document.getElementById("formularioProducto");

    const mensaje =
        document.getElementById("mensajeProducto");

    const boton =
        document.getElementById("btnGuardarProducto");

    const mostrarMensaje = (texto, esError = false) => {
        if (mensaje) {
            mensaje.textContent = texto;
            mensaje.style.color = esError
                ? "#ff6b81"
                : "#42e8c5";
        }
    };

    if (!formulario) return;

    const campoNombre =
        document.getElementById("nombreProducto");

    const campoPrecio =
        document.getElementById("precioProducto");

    const campoCantidad =
        document.getElementById("cantidadProducto");

    const campoCategoria =
        document.getElementById("categoriaProducto");

    const campoDescripcion =
        document.getElementById("descripcionProducto");

    const campoImagen =
        document.getElementById("imagenProducto");

    if (
        !campoNombre ||
        !campoPrecio ||
        !campoCantidad ||
        !campoCategoria ||
        !campoDescripcion ||
        !campoImagen
    ) {
        mostrarMensaje(
            "Faltan campos en el formulario de productos.",
            true
        );
        return;
    }

    const nombre = campoNombre.value.trim();
    const precio = Number(campoPrecio.value);
    const cantidad = Number(campoCantidad.value);
    const categoria = campoCategoria.value;
    const descripcion = campoDescripcion.value.trim();
    const archivo = campoImagen.files?.[0];

    if (
        !nombre ||
        !categoria ||
        campoPrecio.value === "" ||
        campoCantidad.value === "" ||
        !Number.isFinite(precio) ||
        !Number.isFinite(cantidad) ||
        precio < 0 ||
        cantidad < 0 ||
        !Number.isInteger(cantidad)
    ) {
        mostrarMensaje(
            "Revisa el nombre, precio, cantidad y categoría.",
            true
        );
        return;
    }

    if (
        archivo &&
        (
            ![
                "image/jpeg",
                "image/png",
                "image/webp"
            ].includes(archivo.type) ||
            archivo.size > 5 * 1024 * 1024
        )
    ) {
        mostrarMensaje(
            "Usa una imagen JPG, PNG o WebP de máximo 5 MB.",
            true
        );
        return;
    }

    if (boton) {
        boton.disabled = true;
        boton.textContent = "Publicando...";
    }

    try {
        const cliente = obtenerSupabase();

        const { data: sesionData, error: sesionError } =
            await cliente.auth.getSession();

        if (sesionError) throw sesionError;

        const usuario = sesionData.session?.user;

        if (!usuario) {
            throw new Error(
                "Inicia sesión para publicar un producto."
            );
        }

        const { data: tienda, error: errorTienda } =
            await cliente
                .from("tiendas")
                .select("id")
                .eq("usuario_id", usuario.id)
                .maybeSingle();

        if (errorTienda) throw errorTienda;

        if (!tienda) {
            throw new Error(
                "Primero debes crear tu tienda."
            );
        }

        let urlImagen = null;

        if (archivo) {
            mostrarMensaje("Subiendo fotografía...");

            urlImagen = await subirImagenProducto(
                archivo,
                usuario.id
            );
        }

        const { error: errorInsertar } =
            await cliente
                .from("productos")
                .insert({
                    tienda_id: tienda.id,
                    usuario_id: usuario.id,
                    nombre,
                    precio,
                    cantidad,
                    categoria,
                    descripcion: descripcion || null,
                    imagen: urlImagen
                });

        if (errorInsertar) throw errorInsertar;

        formulario.reset();

        const vistaPrevia =
            document.getElementById(
                "vistaPreviaProducto"
            );

        if (vistaPrevia) {
            if (vistaPrevia.dataset.urlTemporal) {
                URL.revokeObjectURL(
                    vistaPrevia.dataset.urlTemporal
                );

                delete vistaPrevia.dataset.urlTemporal;
            }

            vistaPrevia.removeAttribute("src");
            vistaPrevia.hidden = true;
        }

        mostrarMensaje(
            "¡Producto publicado correctamente!"
        );

        // Avisar a las partes de la página que usan el catálogo.
        window.dispatchEvent(
            new CustomEvent("producto-creado")
        );

    } catch (error) {
        console.error(
            "Error al publicar el producto:",
            error
        );

        mostrarMensaje(
            error.message ||
            "No se pudo publicar el producto.",
            true
        );

    } finally {
        if (boton) {
            boton.disabled = false;
            boton.textContent = "Publicar producto";
        }
    }
}

window.abrirFormularioProducto =
    abrirFormularioProducto;

window.cerrarFormularioProducto =
    cerrarFormularioProducto;

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btnPublicarProducto")
        ?.addEventListener(
            "click",
            abrirFormularioProducto
        );
});


/* ==========================================
   CATÁLOGO DE PRODUCTOS
========================================== */

// Cargar los productos publicados desde Supabase.
async function cargarCatalogoProductos() {
    const contenedor =
        document.getElementById("listaProductos");

    const sinResultados =
        document.getElementById("sinResultados");

    if (!contenedor) return;

    contenedor.innerHTML =
        "<p>Cargando productos...</p>";

    try {
        const cliente = obtenerSupabase();

        const { data, error } = await cliente
            .from("productos")
            .select(`
                id,
                nombre,
                precio,
                cantidad,
                categoria,
                descripcion,
                imagen,
                creado_en,
                tienda_id,
                tiendas (
                    nombre,
                    whatsapp
                )
            `)
            .order("creado_en", {
                ascending: false
            });

        if (error) throw error;

        productosCatalogo = data || [];

        mostrarCatalogoProductos();

    } catch (error) {
        console.error(
            "Error al cargar los productos:",
            error
        );

        contenedor.innerHTML =
            "<p>No se pudieron cargar los productos. " +
            "Inténtalo de nuevo.</p>";

        if (sinResultados) {
            sinResultados.hidden = true;
        }
    }
}

// Obtener los datos de la tienda asociada a un producto.
function obtenerTiendaProducto(producto) {
    if (Array.isArray(producto.tiendas)) {
        return producto.tiendas[0] || null;
    }

    return producto.tiendas || null;
}

// Preparar un número para utilizarlo con WhatsApp.
function normalizarNumeroWhatsApp(numero) {
    let digitos = String(numero || "")
        .replace(/\D/g, "");

    // Un número boliviano local normalmente tiene 8 dígitos.
    if (digitos.length === 8) {
        digitos = "591" + digitos;
    }

    // Validar el número boliviano con código internacional.
    if (
        digitos.startsWith("591") &&
        digitos.length !== 11
    ) {
        return "";
    }

    // WhatsApp requiere el código del país y los dígitos,
    // sin signos, espacios ni guiones.
    if (
        digitos.length < 10 ||
        digitos.length > 15
    ) {
        return "";
    }

    return digitos;
}

// Crear el botón de WhatsApp para un producto.
function crearBotonWhatsApp(producto, tiendaRelacionada) {
    const boton = document.createElement("a");

    boton.className = "btn-whatsapp-producto";
    boton.textContent = "Contactar por WhatsApp";
    boton.setAttribute("aria-label",
        `Consultar por WhatsApp sobre ${producto.nombre || "este producto"}`
    );

    const numeroWhatsApp = normalizarNumeroWhatsApp(
        tiendaRelacionada?.whatsapp
    );

    if (!numeroWhatsApp) {
        boton.removeAttribute("href");
        boton.textContent = "WhatsApp no disponible";
        boton.setAttribute("aria-disabled", "true");
        boton.tabIndex = -1;

        return boton;
    }

    const mensajeWhatsApp =
        `Hola, estoy interesado en el producto: ` +
        `${producto.nombre || "Producto"}. ` +
        `¿Sigue disponible?`;

    boton.href =
        `https://wa.me/${numeroWhatsApp}` +
        `?text=${encodeURIComponent(mensajeWhatsApp)}`;

    boton.target = "_blank";
    boton.rel = "noopener noreferrer";

    return boton;
}

// Mostrar los productos en la página principal.
function mostrarCatalogoProductos() {
    const contenedor =
        document.getElementById("listaProductos");

    const sinResultados =
        document.getElementById("sinResultados");

    const orden =
        document.getElementById("ordenProductos");

    if (!contenedor) return;

    let productos = [...productosCatalogo];

    // Filtrar por categoría.
    if (categoriaActiva !== "Todos") {
        productos = productos.filter(
            producto =>
                producto.categoria === categoriaActiva
        );
    }

    // Filtrar por nombre, descripción o tienda.
    if (textoBusquedaProducto) {
        const texto = textoBusquedaProducto
            .toLowerCase();

        productos = productos.filter(producto => {
            const tiendaRelacionada =
                obtenerTiendaProducto(producto);

            const nombreTienda =
                tiendaRelacionada?.nombre || "";

            return (
                (producto.nombre || "")
                    .toLowerCase()
                    .includes(texto) ||

                (producto.descripcion || "")
                    .toLowerCase()
                    .includes(texto) ||

                (producto.categoria || "")
                    .toLowerCase()
                    .includes(texto) ||

                nombreTienda
                    .toLowerCase()
                    .includes(texto)
            );
        });
    }

    // Ordenar los resultados.
    if (orden?.value === "menor-precio") {
        productos.sort(
            (a, b) => Number(a.precio) - Number(b.precio)
        );

    } else if (orden?.value === "mayor-precio") {
        productos.sort(
            (a, b) => Number(b.precio) - Number(a.precio)
        );

    } else if (orden?.value === "nombre") {
        productos.sort((a, b) =>
            (a.nombre || "").localeCompare(
                b.nombre || "",
                "es"
            )
        );

    } else {
        productos.sort(
            (a, b) =>
                new Date(b.creado_en) -
                new Date(a.creado_en)
        );
    }

    contenedor.replaceChildren();

    if (sinResultados) {
        sinResultados.hidden = productos.length !== 0;
    }

    if (productos.length === 0) {
        contenedor.innerHTML =
            "<p>Todavía no hay productos publicados " +
            "que coincidan con tu búsqueda.</p>";

        return;
    }

    productos.forEach(producto => {
        const tarjeta = document.createElement("article");
        tarjeta.className = "producto-tarjeta";

        // Fotografía del producto.
        if (producto.imagen) {
            const imagen = document.createElement("img");

            imagen.className = "producto-imagen";
            imagen.src = producto.imagen;
            imagen.alt =
                producto.nombre ||
                "Fotografía del producto";

            imagen.loading = "lazy";

            imagen.onerror = () => {
                imagen.remove();
            };

            tarjeta.appendChild(imagen);

        } else {
            const sinImagen =
                document.createElement("div");

            sinImagen.className =
                "producto-imagen producto-sin-imagen";

            sinImagen.textContent = "📦";

            sinImagen.setAttribute(
                "aria-label",
                "Producto sin fotografía"
            );

            tarjeta.appendChild(sinImagen);
        }

        const informacion =
            document.createElement("div");

        informacion.className =
            "producto-informacion";

        // Botón de favoritos.
        const botonFavorito =
            document.createElement("button");

        botonFavorito.type = "button";
        botonFavorito.className =
            "btn-favorito-producto";

        // Comprobar que la variable exista antes de usarla.
        const favoritosDisponibles =
            typeof idsFavoritos !== "undefined" &&
            Array.isArray(idsFavoritos);

        const esFavorito = favoritosDisponibles &&
            idsFavoritos.includes(String(producto.id));

        botonFavorito.textContent =
            esFavorito ? "♥" : "♡";

        botonFavorito.classList.toggle(
            "es-favorito",
            esFavorito
        );

        botonFavorito.setAttribute(
            "aria-label",
            esFavorito
                ? "Quitar de favoritos"
                : "Agregar a favoritos"
        );

        botonFavorito.title = esFavorito
            ? "Quitar de favoritos"
            : "Agregar a favoritos";

        botonFavorito.addEventListener(
            "click",
            async () => {
                if (
                    typeof alternarFavorito === "function"
                ) {
                    await alternarFavorito(
                        producto.id,
                        botonFavorito
                    );
                } else {
                    console.error(
                        "No se encontró la función alternarFavorito."
                    );
                }
            }
        );

        tarjeta.appendChild(botonFavorito);

        // Nombre del producto.
        const nombre = document.createElement("h3");

        nombre.textContent =
            producto.nombre || "Producto sin nombre";

        informacion.appendChild(nombre);

        // Precio en bolivianos.
        const precio = document.createElement("p");

        precio.className = "producto-precio";

        precio.textContent =
            "Bs " +
            Number(producto.precio).toLocaleString(
                "es-BO",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );

        informacion.appendChild(precio);

        // Datos de la tienda asociada.
        const tiendaRelacionada =
            obtenerTiendaProducto(producto);

        const nombreTienda =
            tiendaRelacionada?.nombre ||
            "Tienda emprendedora";

        const tienda = document.createElement("p");

        tienda.className = "producto-tienda";
        tienda.textContent = "🏪 " + nombreTienda;

        informacion.appendChild(tienda);

        // Categoría.
        const categoria = document.createElement("p");

        categoria.className = "producto-categoria";
        categoria.textContent =
            producto.categoria || "Otros";

        informacion.appendChild(categoria);

        // Disponibilidad.
        const stock = document.createElement("p");

        stock.className = "producto-stock";

        stock.textContent =
            Number(producto.cantidad) > 0
                ? "Disponible"
                : "Agotado";

        informacion.appendChild(stock);

        // Botón para contactar al vendedor por WhatsApp.
        const botonWhatsApp = crearBotonWhatsApp(
            producto,
            tiendaRelacionada
        );

        informacion.appendChild(botonWhatsApp);

        // Botón para ver el detalle del producto.
        const boton = document.createElement("button");

        boton.type = "button";
        boton.className = "btn-principal";
        boton.textContent = "Ver producto";

        boton.addEventListener("click", () => {
            const parametros = new URLSearchParams({
                id: producto.id
            });

            window.location.href =
                "detalle-producto.html?" +
                parametros.toString();
        });

        informacion.appendChild(boton);

        tarjeta.appendChild(informacion);
        contenedor.appendChild(tarjeta);
    });
}


/* ==========================================
   BÚSQUEDA, FILTROS Y ORDENAMIENTO
========================================== */

document.addEventListener("DOMContentLoaded", () => {
    if (
        typeof supabaseClient !== "undefined" &&
        supabaseClient
    ) {
        cargarCatalogoProductos();
    }

    // Actualizar el catálogo al publicar un producto.
    window.addEventListener(
        "producto-creado",
        cargarCatalogoProductos
    );

    // Filtros del catálogo.
    document.querySelectorAll(
        "#filtrosProductos [data-filtro]"
    ).forEach(boton => {
        boton.addEventListener("click", () => {
            categoriaActiva =
                boton.dataset.filtro || "Todos";

            document.querySelectorAll(
                "#filtrosProductos [data-filtro]"
            ).forEach(otro => {
                otro.classList.remove("activo");
            });

            boton.classList.add("activo");

            mostrarCatalogoProductos();
        });
    });

    // Categorías de la parte superior.
    document.querySelectorAll(
        ".categorias [data-categoria]"
    ).forEach(boton => {
        boton.addEventListener("click", () => {
            categoriaActiva =
                boton.dataset.categoria || "Todos";

            mostrarCatalogoProductos();

            document.getElementById("productos")
                ?.scrollIntoView({
                    behavior: "smooth"
                });
        });
    });

    // Ordenar productos.
    document.getElementById("ordenProductos")
        ?.addEventListener(
            "change",
            mostrarCatalogoProductos
        );

    // Búsqueda de la página principal.
    window.addEventListener(
        "buscar-productos",
        evento => {
            textoBusquedaProducto =
                evento.detail?.busqueda?.trim() || "";

            mostrarCatalogoProductos();

            document.getElementById("productos")
                ?.scrollIntoView({
                    behavior: "smooth"
                });
        }
    );
});
