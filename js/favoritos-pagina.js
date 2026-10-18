
"use strict";

document.addEventListener("DOMContentLoaded", cargarPaginaFavoritos);

async function cargarPaginaFavoritos() {
    const contenedor = document.getElementById("listaFavoritos");
    const mensaje = document.getElementById("mensajeFavoritos");

    const mostrarMensaje = texto => {
        mensaje.textContent = texto;
        mensaje.hidden = false;
    };

    try {
        // Comprobar si el comprador inició sesión.
        const { data: sesionData, error: sesionError } =
            await supabaseClient.auth.getSession();

        if (sesionError) throw sesionError;

        const usuario = sesionData.session?.user;

        if (!usuario) {
            mostrarMensaje("Inicia sesión para consultar tus favoritos.");
            return;
        }

        // Consultar los productos guardados por el comprador.
        const { data: favoritos, error: errorFavoritos } =
            await supabaseClient
                .from("favoritos")
                .select("producto_id")
                .eq("usuario_id", usuario.id);

        if (errorFavoritos) throw errorFavoritos;

        const ids = (favoritos || []).map(f => f.producto_id);

        if (ids.length === 0) {
            mostrarMensaje("Todavía no tienes productos favoritos. ❤️");
            return;
        }

        // Obtener los datos de esos productos.
        const { data: productos, error: errorProductos } =
            await supabaseClient
                .from("productos")
                .select(`
                    id,
                    nombre,
                    precio,
                    cantidad,
                    categoria,
                    imagen,
                    tienda_id,
                    tiendas (nombre)
                `)
                .in("id", ids);

        if (errorProductos) throw errorProductos;

        contenedor.replaceChildren();

        if (!productos || productos.length === 0) {
            mostrarMensaje("Los productos guardados ya no están disponibles.");
            return;
        }

        mensaje.hidden = true;

        productos.forEach(producto => {
            const tarjeta = document.createElement("article");
            tarjeta.className = "producto-tarjeta";

            if (producto.imagen) {
                const imagen = document.createElement("img");
                imagen.className = "producto-imagen";
                imagen.src = producto.imagen;
                imagen.alt = producto.nombre || "Producto";
                imagen.loading = "lazy";
                tarjeta.appendChild(imagen);
            }

            const informacion = document.createElement("div");
            informacion.className = "producto-informacion";

            const nombre = document.createElement("h3");
            nombre.textContent = producto.nombre || "Producto";
            informacion.appendChild(nombre);

            const precio = document.createElement("p");
            precio.className = "producto-precio";
            precio.textContent = "Bs " +
                Number(producto.precio).toLocaleString("es-BO", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            informacion.appendChild(precio);

            const tienda = Array.isArray(producto.tiendas)
                ? producto.tiendas[0]?.nombre
                : producto.tiendas?.nombre;

            const nombreTienda = document.createElement("p");
            nombreTienda.className = "producto-tienda";
            nombreTienda.textContent = "🏪 " +
                (tienda || "Tienda emprendedora");
            informacion.appendChild(nombreTienda);

            const botonVer = document.createElement("button");
            botonVer.type = "button";
            botonVer.className = "btn-principal";
            botonVer.textContent = "Ver producto";

            botonVer.addEventListener("click", () => {
                const parametros = new URLSearchParams({
                    id: producto.id
                });

                window.location.href =
                    "detalle-producto.html?" + parametros.toString();
            });

            informacion.appendChild(botonVer);

            const botonQuitar = document.createElement("button");
            botonQuitar.type = "button";
            botonQuitar.className = "btn-quitar-favorito";
            botonQuitar.textContent = "♥ Quitar de favoritos";

            botonQuitar.addEventListener("click", async () => {
                botonQuitar.disabled = true;
                botonQuitar.textContent = "Quitando...";

                try {
                    const { error } = await supabaseClient
                        .from("favoritos")
                        .delete()
                        .eq("usuario_id", usuario.id)
                        .eq("producto_id", producto.id);

                    if (error) throw error;

                    tarjeta.remove();

                    if (!contenedor.children.length) {
                        mostrarMensaje("Ya no tienes productos favoritos. ❤️");
                    }
                } catch (error) {
                    console.error("Error al quitar favorito:", error);
                    alert("No se pudo quitar el producto de favoritos.");
                    botonQuitar.disabled = false;
                    botonQuitar.textContent = "♥ Quitar de favoritos";
                }
            });

            informacion.appendChild(botonQuitar);
            tarjeta.appendChild(informacion);
            contenedor.appendChild(tarjeta);
        });

    } catch (error) {
        console.error("Error al cargar favoritos:", error);
        mostrarMensaje("No se pudieron cargar los favoritos. Inténtalo de nuevo.");
    }
}
