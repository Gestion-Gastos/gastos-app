import { useEffect, useRef, useState } from 'react'
import { bajarComprobante, nombreComprobante, tipoComprobante } from '../comprobantes'

// Muestra el comprobante en pantalla (PDF, imagen, Excel, Word, texto) y permite descargarlo
export default function VisorComprobante({ ruta, onCerrar }) {
  const nombre = nombreComprobante(ruta)
  const tipo = tipoComprobante(ruta)
  const [blob, setBlob] = useState(null)
  const [url, setUrl] = useState(null)
  const [hojas, setHojas] = useState(null)
  const [hoja, setHoja] = useState(0)
  const [texto, setTexto] = useState(null)
  const [error, setError] = useState(null)
  const word = useRef(null)

  useEffect(() => {
    let vigente = true
    let creada
    bajarComprobante(ruta).then(
      (b) => {
        if (!vigente) return
        creada = URL.createObjectURL(b)
        setBlob(b)
        setUrl(creada)
      },
      (e) => vigente && setError(e.message)
    )
    return () => {
      vigente = false
      if (creada) URL.revokeObjectURL(creada)
    }
  }, [ruta])

  // Excel, Word y texto se arman en el navegador; las librerías se cargan recién cuando hacen falta
  useEffect(() => {
    if (!blob) return
    if (tipo === 'excel') {
      Promise.all([import('xlsx'), blob.arrayBuffer()])
        .then(([XLSX, datos]) => {
          const libro = XLSX.read(datos)
          setHojas(
            libro.SheetNames.map((n) => ({
              nombre: n,
              html: XLSX.utils.sheet_to_html(libro.Sheets[n], { header: '', footer: '' }),
            }))
          )
        })
        .catch(() => setError('No se pudo leer la planilla.'))
    } else if (tipo === 'word') {
      import('docx-preview')
        .then((docx) => docx.renderAsync(blob, word.current, undefined, { inWrapper: false }))
        .catch(() => setError('No se pudo leer el documento.'))
    } else if (tipo === 'texto') {
      blob.text().then(setTexto)
    }
  }, [blob, tipo])

  useEffect(() => {
    const tecla = (e) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [onCerrar])

  let contenido
  if (error) contenido = <p className="error">{error}</p>
  else if (!url) contenido = <p className="vacio">Cargando…</p>
  else if (tipo === 'pdf') contenido = <iframe src={url} title={nombre} />
  else if (tipo === 'imagen') contenido = <img src={url} alt={nombre} />
  else if (tipo === 'word') contenido = <div className="visor-word" ref={word} />
  else if (tipo === 'texto') contenido = <pre className="visor-texto">{texto}</pre>
  else if (tipo === 'excel')
    contenido = !hojas ? (
      <p className="vacio">Cargando…</p>
    ) : (
      <>
        {hojas.length > 1 && (
          <div className="visor-hojas">
            {hojas.map((h, i) => (
              <button key={h.nombre} className={i === hoja ? '' : 'secundario'} onClick={() => setHoja(i)}>
                {h.nombre}
              </button>
            ))}
          </div>
        )}
        <div className="visor-excel" dangerouslySetInnerHTML={{ __html: hojas[hoja].html }} />
      </>
    )
  else contenido = <p className="vacio">Este tipo de archivo no se puede ver en pantalla. Descargalo para abrirlo.</p>

  return (
    <div className="visor-fondo" onClick={onCerrar}>
      <div className="visor" role="dialog" aria-label={nombre} onClick={(e) => e.stopPropagation()}>
        <div className="visor-barra">
          <span className="visor-nombre">{nombre}</span>
          {url && (
            <a className="boton" href={url} download={nombre}>Descargar</a>
          )}
          <button className="secundario" onClick={onCerrar}>Cerrar</button>
        </div>
        <div className="visor-contenido">{contenido}</div>
      </div>
    </div>
  )
}
