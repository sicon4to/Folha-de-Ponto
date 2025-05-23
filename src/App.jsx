import React from "react";
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Paper,
  Checkbox,
  FormControlLabel
} from "@mui/material";
import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const diasSemana = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
function formatarDataBrasileira(dataISO) {
  const data = new Date(dataISO + "T12:00:00");
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

function parseHorasMinutos(horario) {
  const [horas, minutos] = horario.split(':').map(Number);
  return horas * 60 + minutos;
}

const calcularHoras = (entrada, almocoInicio, almocoFim, saida, diaSemana, feriado, salario) => {
  const minutosEntrada = parseHorasMinutos(entrada);
  const minutosAlmocoInicio = parseHorasMinutos(almocoInicio);
  const minutosAlmocoFim = parseHorasMinutos(almocoFim);
  const minutosSaida = parseHorasMinutos(saida);

  const tempoManha = minutosAlmocoInicio - minutosEntrada;
  const tempoTarde = minutosSaida - minutosAlmocoFim;
  const totalMinutos = tempoManha + tempoTarde;

  let minutosExtras;
  let cargaPadrao = diaSemana === "sexta" ? 8 * 60 : 8.5 * 60;

  if (feriado || diaSemana === "domingo" || diaSemana === "sábado") {
    // Feriado, Domingo ou Sábado → tudo é extra
    minutosExtras = totalMinutos;
  } else {
    minutosExtras = Math.max(0, totalMinutos - cargaPadrao);
  }

  const horasTrabalhadas = Math.floor(totalMinutos / 60);
  const minutosTrabalhados = totalMinutos % 60;

  const horasExtras = Math.floor(minutosExtras / 60);
  const minutosExtrasFormatados = minutosExtras % 60;

  // Adicional conforme o dia
  let adicional = 1.5; // padrão
  if (feriado || diaSemana === "domingo") adicional = 2; // Feriado e domingo são 100% 
  else if (diaSemana === "sábado") adicional = 1.5; // Como minha escala é 5x2, sábado é extra em 50%

  return {
    horasTrabalhadas: `${horasTrabalhadas}h${minutosTrabalhados.toString().padStart(2, '0')}`,
    horasExtras: `${horasExtras}h${minutosExtrasFormatados.toString().padStart(2, '0')}`,
    valorExtras: ((minutosExtras / 60) * (salario / 189) * adicional).toFixed(2),
  };
};



function CalculadoraExtra() {
  const [dados, setDados] = useState({
    entrada: "",
    almocoInicio: "",
    almocoFim: "",
    saida: "",
    data: "",
    feriado: false,
  });

  const excluirItem = (indexParaExcluir) => {
    const novoHistorico = historico.filter((_, index) => index !== indexParaExcluir);
    setHistorico(novoHistorico);
    localStorage.setItem("historicoHoras", JSON.stringify(novoHistorico));
  };


  const [salario, setSalario] = useState("");
  const [resultado, setResultado] = useState(null);
  const [historico, setHistorico] = useState(
    JSON.parse(localStorage.getItem("historicoHoras")) || []
  );

  const handleChange = (e) => {
    setDados({
      ...dados,
      [e.target.name]: e.target.value,
    });
  };

  const handleSalarioChange = (e) => {
    setSalario(Number(e.target.value));
  };

  const limparDados = () => {
    setDados({
      entrada: "",
      almocoInicio: "",
      almocoFim: "",
      saida: "",
      data: "",
      feriado: ""
    });
    setResultado(null);
  };

  const calcular = () => {
    if (!dados.data) {
      alert("Selecione uma data!");
      return;
    }
    const partesData = dados.data.split("-");
    const dataSelecionada = new Date(
      parseInt(partesData[0]), //Ano
      parseInt(partesData[1]) - 1, //Mês (subtrai 1 porque os meses em JavaScript são indexados a partir de 0)
      parseInt(partesData[2]) //Dia
    )
    const diaSemana = diasSemana[dataSelecionada.getDay()];

    const res = calcularHoras(
      dados.entrada,
      dados.almocoInicio,
      dados.almocoFim,
      dados.saida,
      diaSemana,
      dados.feriado,
      salario
    );
    const registro = { ...dados, diaSemana, ...res, salario };
    const novoHistorico = [registro, ...historico];
    setResultado(res);
    setHistorico(novoHistorico);
    localStorage.setItem("historicoHoras", JSON.stringify(novoHistorico));
    limparDados();
  };

  const limparHistorico = () => {
    setHistorico([]);
    localStorage.removeItem("historicoHoras");
  };

  function formatarDecimalParaHoraTexto(decimal) {
    const horas = Math.floor(decimal);
    const minutos = Math.round((decimal - horas) * 60);
    return `${horas}h${minutos.toString().padStart(2, '0')}`;
  }

  const exportarPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      starty: 30,
      styles: {
        fontSyze: 9,
        cellPadding: 3,
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontSize: "bold",
        lineColor: [0, 0, 0],
        lineWidth: 0.3,
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { left: 14, right: 14 },
      theme: 'grid',
      columnStyles: {
        0: { cellWidth: 25, overflow: 'linebreak' },
        1: { cellWidth: 18 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 18 },
        5: { cellWidth: 20 },
        6: { cellWidth: 20 },
        7: { cellWidth: 25 },
        8: { cellWidth: 25 },
        9: { cellWidth: 25 },
        10: { cellWidth: 30 },
      }
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Relatório de Horas Extras", doc.internal.pageSize.getWidth() / 2, 20, { align: "center" });

    const cabecalho = [
      "Data",
      "Entrada",
      "Almoço Início",
      "Almoço Fim",
      "Saída",
      "Dia da Semana",
      "Feriado",
      "Salário (R$)",
      "Horas Trabalhadas",
      "Horas Extras",
      "Valor Extras (R$)"
    ];

    const linhas = historico.map(item => [
      formatarDataBrasileira(item.data),
      item.entrada,
      item.almocoInicio,
      item.almocoFim,
      item.saida,
      item.diaSemana,
      item.feriado,
      item.salario,
      item.horasTrabalhadas,
      item.horasExtras,
      item.valorExtras
    ]);

    autoTable(doc, {
      head: [cabecalho],
      body: linhas,
      startY: 30,
      styles: {
        fontSize: 9,
        cellPadding: 1,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { left: 10, right: 10 },
      theme: 'grid',
      columnStyles: {
        0: { cellWidth: 20, overflow: 'linebreak' }, //Data
        1: { overflow: 'linebreak' }, // Entrada
        5: { cellWidth: 20, overflow: 'linebreak' }, // Dia da Semana
        7: { cellWidth: 20, overflow: 'linebreak' }, // Salario
        8: { cellWidth: 20, overflow: 'linebreak' }, // Horas Trabalhadas
        9: { cellWidth: 20, overflow: 'linebreak' }, // Horas Extras
        10: { cellWidth: 20, overflow: 'linebreak' } // Valor Extras
      }
    });

    // Converter horasExtras de "0h30" para decimal
    const converterHorasParaDecimal = (texto) => {
      if (!texto || !texto.includes("h")) return 0;
      const partes = texto.match(/(\d+)h(\d+)?/);
      if (!partes) return 0;
      const horas = parseInt(partes[1], 10);
      const minutos = parseInt(partes[2] || "0", 10);
      return horas + (minutos / 60);
    };

    const totalHorasExtras = historico.reduce((total, item) => {
      return total + converterHorasParaDecimal(item.horasExtras);
    }, 0);

    const totalValorExtras = historico.reduce((total, item) => {
      return total + parseFloat(item.valorExtras || 0);
    }, 0);

    const finalY = doc.lastAutoTable.finalY + 10;
    const posY = doc.lastAutoTable.finalY + 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Total de Horas Extras: ${formatarDecimalParaHoraTexto(totalHorasExtras)}`, 14, posY + 8);
    doc.text(`Total a Receber (Extras): R$ ${totalValorExtras.toFixed(2)}`, 14, finalY + 8);

    doc.save("relatorio.pdf");
  };



  return (
    <Container maxWidth="sm" sx={{ mt: 4, backgroundColor: "white" }}>
      <Typography variant="h5" gutterBottom sx={{ textAlign: "center", textShadow: "1px 2px 3px #ccc" }}>
        Calculadora de Horas Extras
      </Typography>

      <Box component={Paper} p={3} mb={3} sx={{ 
        borderRadius: 7, 
        boxShadow: 15,
        border: "3px solid #ccc",
        }}>
        <TextField
          label="Data"
          type="date"
          name="data"
          value={dados.data}
          onChange={handleChange}
          fullWidth
          margin="normal"
          InputLabelProps={{
            shrink: true,
          }}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={dados.feriado}
              onChange={(e) => setDados({ ...dados, feriado: e.target.checked })}
              name="feriado"
            />
          }
          label="Feriado?"
        />
        <TextField
          label="Entrada"
          type="time"
          name="entrada"
          value={dados.entrada}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Início do Almoço"
          type="time"
          name="almocoInicio"
          value={dados.almocoInicio}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Fim do Almoço"
          type="time"
          name="almocoFim"
          value={dados.almocoFim}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Saída"
          type="time"
          name="saida"
          value={dados.saida}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Salário (R$)"
          type="number"
          value={salario}
          onChange={handleSalarioChange}
          fullWidth
          margin="normal"
        />

        <Button variant="contained" fullWidth onClick={calcular} sx={{
          mt: 2,
          borderRadius: 3,
          backgroundColor: "#a52a2a",
          color: "white",
          fontWeight: "bold",
        }}>
          Calcular
        </Button>
      </Box>

      {resultado && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography>Horas Trabalhadas: {resultado.horasTrabalhadas}</Typography>
          <Typography>Horas Extras: {resultado.horasExtras}</Typography>
          <Typography>Valor a receber: R$ {resultado.valorExtras}</Typography>
        </Paper>
      )}

      {historico.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{
            padding: 1,
            textAlign: "center"
          }}>
            Histórico</Typography>
          <Button
            variant="outlined"
            color="error"
            onClick={limparHistorico}
            sx={{ mb: 2, mt: 1, ml: 8 }}
          >
            Limpar Histórico
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={exportarPDF}
            sx={{ mb: 2, mt: 1, ml: 13 }}
          >
            Exportar PDF
          </Button>
          {historico.map((item, index) => (
            <Paper key={index} sx={{ 
              padding: 2, 
              marginBottom: 2,
              borderRadius: 7,
              boxShadow: 15,
              border: "1px solid #ccc",
              }}>
              <Typography><strong>Data:</strong> {formatarDataBrasileira(item.data)}</Typography>
              <Typography><strong>Entrada:</strong> {item.entrada}</Typography>
              <Typography><strong>Almoço: </strong> {item.almocoInicio}</Typography>
              <Typography><strong>Retorno: </strong> {item.almocoFim}</Typography>
              <Typography><strong>Saída:</strong> {item.saida}</Typography>
              <Typography><strong>Horas Extras:</strong> {item.horasExtras}</Typography>
              <Typography><strong>Valor Extras:</strong> R$ {item.valorExtras}</Typography>

              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => excluirItem(index)}
                sx={{ marginTop: 1 }}
              >
                Excluir Item
              </Button>
            </Paper>
          ))}

        </Box>
      )}
    </Container>
  );
}

export default CalculadoraExtra;
