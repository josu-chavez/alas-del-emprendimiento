
"use strict";

let idsFavoritos = [];
let usuarioFavoritos = null;
let cargandoFavoritos = false;

async function obtenerUsuarioFavoritos() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) throw error;

    return data.session?.user || null;
}

async function cargarFavoritos() {
    if (cargandoFavoritos) return;

    cargandoFavoritos = true;

    try {
        usuarioFavoritos = await obtenerUsuarioFavoritos();

        if (!usuarioFavoritos) {
            idsFavoritos = [];
            actualizarContadorFavoritos();
            return;
        }

        const { data, error } = await supabaseClient
            .from("favoritos")
            .select("producto_id")
            .eq("usuario_id", usuarioFavoritos.id);

        if (error) throw error;

        idsFavoritos = (data || []).map(
            favorito => String(favorito.producto_id)
        );

        actualizarContadorFavoritos();

        if (typeof mostrarCatalogoProductos === "function") {
            mostrarCatalogoProductos();
        }
    } catch (error) {
        console.error("Error al cargar favoritos:", error);
    } finally {
        cargandoFavoritos = false;
    }
}

function actualizarContadorFavoritos() {
    const contador = document.getElementById("contadorFavoritos");

    if (contador) {
        contador.textContent = idsFavoritos.length;
    }
}

function crearCorazonesFlotantes(boton) {
    const tarjeta = boton.closest(".producto-tarjeta");

    if (!tarjeta) return;

    for (let i = 0; i < 5; i++) {
        const corazon = document.createElement("span");

        corazon.className = "corazon-flotante";
        corazon.textContent = "♥";
        corazon.style.left = `${45 + Math.random() * 35}%`;
        corazon.style.top = "35px";
        corazon.style.animationDelay = `${i * 0.08}s`;

        tarjeta.appendChild(corazon);

        window.setTimeout(() => {
            corazon.remove();
        }, 1400);
    }
}


async function alternarFavorito(productoId, boton) {
    if (!productoId || !boton || boton.disabled) return;

    boton.disabled = true;

    try {
        const usuario = await obtenerUsuarioFavoritos();

        if (!usuario) {
            alert("Inicia sesión para guardar tus productos favoritos.");
            return;
        }

        const idProducto = String(productoId);
        const yaEsFavorito = idsFavoritos.includes(idProducto);

        if (yaEsFavorito) {
            const { error } = await supabaseClient
                .from("favoritos")
                .delete()
                .eq("usuario_id", usuario.id)
                .eq("producto_id", productoId);

            if (error) throw error;

            idsFavoritos = idsFavoritos.filter(
                id => id !== idProducto
            );

            boton.textContent = "♡";
            boton.classList.remove("es-favorito");
            boton.setAttribute("aria-label", "Agregar a favoritos");
            boton.title = "Agregar a favoritos";
        } else {
            const { error } = await supabaseClient
                .from("favoritos")
                .insert({
                    usuario_id: usuario.id,
                    producto_id: productoId
                });

            if (error) throw error;

            idsFavoritos.push(idProducto);

            // Pintar el corazón de rojo.
            boton.textContent = "♥";
            boton.classList.add("es-favorito");
            boton.setAttribute("aria-label", "Quitar de favoritos");
            boton.title = "Quitar de favoritos";

            // Animar el corazón principal.
            boton.classList.remove("animar-corazon");
            void boton.offsetWidth;
            boton.classList.add("animar-corazon");

            // Crear corazones flotantes.
            const tarjeta = boton.closest(".producto-tarjeta");

            if (tarjeta) {
                for (let i = 0; i < 5; i++) {
                    const corazon = document.createElement("span");

                    corazon.className = "corazon-flotante";
                    corazon.textContent = "♥";
                    corazon.style.left = `${45 + Math.random() * 35}%`;
                    corazon.style.top = "35px";
                    corazon.style.animationDelay = `${i * 0.08}s`;

                    tarjeta.appendChild(corazon);

                    window.setTimeout(() => {
                        corazon.remove();
                    }, 1400);
                }
            }
        }

        actualizarContadorFavoritos();
    } catch (error) {
        console.error("Error al actualizar favorito:", error);
        alert("No se pudo actualizar el favorito. Revisa la consola con F12.");
    } finally {
        boton.disabled = false;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const botonFavoritos = document.getElementById("btnFavoritos");

    if (botonFavoritos) {
        botonFavoritos.addEventListener("click", () => {
            window.location.href = "favoritos.html";
        });
    }

    if (typeof supabaseClient !== "undefined" && supabaseClient) {
        cargarFavoritos();
    }
});
