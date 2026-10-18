
"use strict";

// ALAS DEL EMPRENDIMIENTO

document.addEventListener("DOMContentLoaded", () => {
    console.log("ALAS DEL EMPRENDIMIENTO está funcionando.");

    if (typeof supabaseClient === "undefined" || !supabaseClient) {
        console.error("No se encontró la conexión con Supabase.");
        return;
    }

    console.log("Supabase está disponible para la aplicación.");

    // Elementos de búsqueda.
    const formularioBusqueda = document.getElementById("formBusqueda");
    const campoBusqueda = document.getElementById("busqueda");

    if (formularioBusqueda && campoBusqueda) {
        formularioBusqueda.addEventListener("submit", (evento) => {
            evento.preventDefault();

            const busqueda = campoBusqueda.value.trim();

            if (!busqueda) {
                mostrarAviso("Escribe el nombre del producto que buscas.");
                return;
            }

            const parametros = new URLSearchParams({ busqueda });

            window.dispatchEvent(
                new CustomEvent("buscar-productos", {
                    detail: { busqueda, parametros }
                })
            );

            mostrarAviso(
                "La búsqueda está preparada. Conectaremos el catálogo en el siguiente paso."
            );
        });
    }

    // Cargar las tiendas registradas.
    cargarTiendas();

    // Actualizar la lista cuando se crea una tienda.
    window.addEventListener("tienda-creada", cargarTiendas);
});

// Consultar las tiendas guardadas en Supabase.


async function cargarTiendas() {
    const contenedor = document.getElementById("listaTiendasRecomendadas");

    if (!contenedor) return;

    contenedor.innerHTML =
        '<p class="mensaje-tiendas">Cargando tiendas...</p>';

    try {
        const { data: tiendas, error } = await supabaseClient
            .from("tiendas")
            .select(
                "id, nombre, descripcion, categoria, ubicacion, portada, portada_url, calificacion"
            )
            .order("nombre", { ascending: true });

        if (error) throw error;

        if (!tiendas || tiendas.length === 0) {
            contenedor.innerHTML = `
                <div class="estado-tiendas">
                    <span class="icono-estado">✦</span>
                    <h3>Tu emprendimiento puede ser el primero</h3>
                    <p>
                        Todavía no hay tiendas registradas.
                        ¡Pronto descubrirás nuevos negocios!
                    </p>
                </div>
            `;
            return;
        }

        contenedor.replaceChildren();

        tiendas.forEach((tienda) => {
            const tarjeta = document.createElement("article");
            tarjeta.className = "tarjeta-emprendimiento";

            // PORTADA
            const zonaPortada = document.createElement("div");
            zonaPortada.className = "zona-portada-tienda";

            const imagenUrl = tienda.portada_url || tienda.portada;

            if (imagenUrl) {
                const portada = document.createElement("img");

                portada.className = "portada-tarjeta-tienda";
                portada.src = imagenUrl;
                portada.alt = "Portada de " + (tienda.nombre || "la tienda");
                portada.loading = "lazy";

                portada.onerror = () => {
                    portada.remove();
                    zonaPortada.classList.add("portada-sin-imagen");
                    zonaPortada.textContent = "✦";
                };

                zonaPortada.appendChild(portada);
            } else {
                zonaPortada.classList.add("portada-sin-imagen");
                zonaPortada.textContent = "✦";
            }

            tarjeta.appendChild(zonaPortada);

            // CONTENIDO
            const contenido = document.createElement("div");
            contenido.className = "contenido-tarjeta-tienda";

            const categoria = document.createElement("span");
            categoria.className = "etiqueta-categoria-tienda";
            categoria.textContent = tienda.categoria || "Emprendimiento";
            contenido.appendChild(categoria);

            const titulo = document.createElement("h3");
            titulo.className = "nombre-tienda-tarjeta";
            titulo.textContent = tienda.nombre || "Tienda sin nombre";
            contenido.appendChild(titulo);

            const descripcion = document.createElement("p");
            descripcion.className = "descripcion-tienda-tarjeta";
            descripcion.textContent =
                tienda.descripcion ||
                "Descubre los productos de este emprendimiento.";
            contenido.appendChild(descripcion);

            // VALORACIÓN
            const valoracion = Number(tienda.calificacion);
            const tieneValoracion =
                tienda.calificacion !== null &&
                tienda.calificacion !== undefined &&
                tienda.calificacion !== "" &&
                Number.isFinite(valoracion) &&
                valoracion >= 0 &&
                valoracion <= 5;

            const bloqueEstrellas = document.createElement("div");
            bloqueEstrellas.className = "valoracion-tienda-tarjeta";

            if (tieneValoracion && valoracion > 0) {
                const estrellas = document.createElement("span");
                estrellas.className = "estrellas-tienda";
                estrellas.textContent =
                    "★".repeat(Math.round(valoracion)) +
                    "☆".repeat(5 - Math.round(valoracion));

                const numero = document.createElement("span");
                numero.className = "numero-valoracion-tienda";
                numero.textContent = valoracion.toFixed(1) + " / 5";

                bloqueEstrellas.append(estrellas, numero);
            } else {
                bloqueEstrellas.textContent = "☆ Sin valoraciones";
            }

            contenido.appendChild(bloqueEstrellas);

            if (tienda.ubicacion) {
                const ubicacion = document.createElement("p");
                ubicacion.className = "ubicacion-tienda-tarjeta";
                ubicacion.textContent = "📍 " + tienda.ubicacion;
                contenido.appendChild(ubicacion);
            }

            tarjeta.appendChild(contenido);

            // BOTÓN AL PERFIL REAL DE LA TIENDA
            const pie = document.createElement("div");
            pie.className = "pie-tarjeta-tienda";

            const botonTienda = document.createElement("button");
            botonTienda.type = "button";
            botonTienda.className = "btn-principal btn-ver-tienda";
            botonTienda.textContent = "VISITAR TIENDA →";

            botonTienda.addEventListener("click", () => {
                const parametros = new URLSearchParams({
                    id: tienda.id
                });

                window.location.href =
                    "perfil-tienda.html?" + parametros.toString();
            });

            pie.appendChild(botonTienda);
            tarjeta.appendChild(pie);

            contenedor.appendChild(tarjeta);
        });

    } catch (error) {
        console.error("Error al cargar las tiendas:", error);

        contenedor.innerHTML = `
            <div class="estado-tiendas">
                <h3>No pudimos cargar las tiendas</h3>
                <p>Comprueba tu conexión e inténtalo de nuevo.</p>
            </div>
        `;
    }
}

// Mostrar avisos en la página.
function mostrarAviso(mensaje) {
    const aviso = document.getElementById("aviso");

    if (!aviso) {
        console.log(mensaje);
        return;
    }

    aviso.textContent = mensaje;
    aviso.hidden = false;

    window.setTimeout(() => {
        aviso.hidden = true;
    }, 3500);
}
