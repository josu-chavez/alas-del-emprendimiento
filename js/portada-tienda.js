
document.addEventListener("change", function (evento) {
    if (evento.target.id !== "portadaTienda") return;

    const input = evento.target;
    const archivo = input.files?.[0];
    const vistaPrevia = document.getElementById("vistaPreviaPortada");
    const textoSeleccion = document.querySelector(".texto-zona-portada");
    const detalleSeleccion = document.querySelector(".detalle-portada");

    console.log("Se detectó el cambio de portada.");
    console.log("Vista previa encontrada:", vistaPrevia);
    console.log("Archivo seleccionado:", archivo);

    if (!vistaPrevia) {
        console.error("No se encontró la vista previa de la portada.");
        return;
    }

    function limpiarPortada() {
        input.value = "";
        vistaPrevia.removeAttribute("src");
        vistaPrevia.hidden = true;

        if (textoSeleccion) {
            textoSeleccion.textContent = "Seleccionar imagen";
        }

        if (detalleSeleccion) {
            detalleSeleccion.textContent =
                "Haz clic aquí para elegir tu portada";
        }
    }

    if (!archivo) {
        limpiarPortada();
        return;
    }

    const tiposPermitidos = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!tiposPermitidos.includes(archivo.type)) {
        alert("Selecciona una imagen JPG, PNG o WebP.");
        limpiarPortada();
        return;
    }

    if (archivo.size > 5 * 1024 * 1024) {
        alert("La imagen no debe superar los 5 MB.");
        limpiarPortada();
        return;
    }

    const lector = new FileReader();

    lector.onload = function () {
        vistaPrevia.src = lector.result;
        vistaPrevia.hidden = false;

        if (textoSeleccion) {
            textoSeleccion.textContent = "Imagen seleccionada";
        }

        if (detalleSeleccion) {
            detalleSeleccion.textContent = archivo.name;
        }
    };

    lector.onerror = function () {
        alert("No se pudo leer la imagen. Inténtalo de nuevo.");
        limpiarPortada();
    };

    lector.readAsDataURL(archivo);
});
