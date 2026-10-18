
/* =========================================
   ALAS DEL EMPRENDIMIENTO
   CONEXIÓN CON SUPABASE
========================================= */

const SUPABASE_URL =
    "https://rfapzvtopxsewvfyxwmw.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_njU0dzC-Nb1is9KuliA2VQ_VVjACIg-";

/* Crear el cliente y dejarlo disponible
   para los demás archivos JavaScript. */

if (
    !window.supabase ||
    typeof window.supabase.createClient !== "function"
) {
    console.error(
        "No se cargó la biblioteca de Supabase. Revisa el orden de los scripts."
    );
} else {
    window.supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );

    console.log("Biblioteca de Supabase:", "Disponible");
    console.log("Cliente de Supabase:", "Disponible");

    /* Comprobar la conexión con la tabla perfiles. */

    window.supabaseClient
        .from("perfiles")
        .select("id")
        .limit(1)
        .then(({ data, error }) => {
            if (error) {
                console.error(
                    "Error al consultar perfiles:",
                    error.message
                );
            } else {
                console.log(
                    "Conexión con Supabase correcta."
                );

                console.log(
                    "Perfiles encontrados:",
                    data.length
                );
            }
        });
}
