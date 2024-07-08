import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import './ExcelLikeTable.css';

const ExcelLikeTable = () => {
  const [rows, setRows] = useState(() => {
    // Cargar datos de localStorage si están disponibles
    const savedRows = localStorage.getItem('rows');
    return savedRows ? JSON.parse(savedRows) : [{ codigo: '', descripcion: '', fecha: '', destino: '', cantidad: 1, bloqueado: false }];
  });
  const [showAlert, setShowAlert] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const inputRefs = useRef([]);
  const [workbook, setWorkbook] = useState(null);

  useEffect(() => {
    if (currentIndex !== null && inputRefs.current[currentIndex]) {
      inputRefs.current[currentIndex].focus();
    }
  }, [rows, currentIndex]);

  useEffect(() => {
    fetch('/Prueba.xlsx')
      .then(response => response.arrayBuffer())
      .then(data => {
        const workbook = XLSX.read(data, { type: 'array' });
        setWorkbook(workbook);
      });

    // Agregar el evento beforeunload
    const handleBeforeUnload = (e) => {
      if (!hasDownloaded) {
        const message = 'Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?';
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasDownloaded]);

  useEffect(() => {
    // Guardar los datos en localStorage cuando rows cambie
    localStorage.setItem('rows', JSON.stringify(rows));
  }, [rows]);

  const handleChange = (index, key, value) => {
    const newRows = [...rows];
    newRows[index][key] = value;
    setRows(newRows);
  };

  const handleAddRow = () => {
    const lastRow = rows[rows.length - 1];
    const newRow = {
      ...lastRow,
      codigo: '',
      cantidad: parseInt(lastRow.cantidad, 10) + 1, // Incrementa la cantidad
      bloqueado: false,
    };
    setRows([...rows, newRow]);
    setCurrentIndex(rows.length);
  };

  const handleKeyPress = (index, e) => {
    if (e.key === 'Enter') {
      const newRows = [...rows];
      const currentCodigo = newRows[index].codigo;

      if (newRows.some((row, idx) => row.codigo === currentCodigo && idx !== index)) {
        setShowAlert(true);
        newRows[index].codigo = ''; // Borra el código repetido
        setRows(newRows);
        return;
      }

      newRows[index].bloqueado = true; // Bloquea el campo de código de barras después de presionar Enter
      setRows(newRows);
      handleAddRow();
    }
  };

  const exportToExcel = () => {
    if (!workbook) return;

    const worksheet = workbook.Sheets['DATA BASE'];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Agrega los encabezados si es necesario
    const headers = ['Código de Barra', 'Descripción', 'Fecha', 'Destino', 'Cantidad'];
    if (data.length === 0) {
      data.push(headers);
    }

    // Agrega las nuevas filas a partir de la segunda fila
    rows.forEach(row => {
      const newRow = [row.codigo, row.descripcion, row.fecha, row.destino, row.cantidad];
      data.push(newRow);
    });

    const newWorksheet = XLSX.utils.aoa_to_sheet(data);
    workbook.Sheets['DATA BASE'] = newWorksheet;

    // Generar archivo modificado
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    // Crear un enlace para descargar el archivo
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Prueba.xlsx';
    a.click();
    URL.revokeObjectURL(url);

    // Marcar que el archivo ha sido descargado
    setHasDownloaded(true);
    localStorage.removeItem('rows');
  };

  const handleAlertClose = () => {
    setShowAlert(false);
    setCurrentIndex(currentIndex !== null ? currentIndex - 1 : null);
  };

  return (
    <div>
      {showAlert && (
        <div className="alert">
          <p>El código está repetido</p>
          <button onClick={handleAlertClose}>Seguir</button>
        </div>
      )}
      <table>
        <thead>
          <tr>
            <th>Código de Barra</th>
            <th>Descripción</th>
            <th>Fecha</th>
            <th>Destino</th>
            <th>Cantidad</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <td>
                <input
                  type="text"
                  value={row.codigo}
                  ref={el => (inputRefs.current[index] = el)}
                  onChange={e => handleChange(index, 'codigo', e.target.value)}
                  onKeyPress={e => handleKeyPress(index, e)}
                  disabled={row.bloqueado && row.codigo !== ''}
                />
              </td>
              <td>
                <input
                  type="text"
                  value={row.descripcion}
                  onChange={e => handleChange(index, 'descripcion', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="date"
                  value={row.fecha}
                  onChange={e => handleChange(index, 'fecha', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="text"
                  value={row.destino}
                  onChange={e => handleChange(index, 'destino', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={row.cantidad}
                  onChange={e => handleChange(index, 'cantidad', e.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={handleAddRow}>Agregar Fila</button>
      <button onClick={exportToExcel}>Crear Excel</button>
    </div>
  );
};

export default ExcelLikeTable;