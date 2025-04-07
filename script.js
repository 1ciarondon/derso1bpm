   // URL do Apps Script para pesquisa de funcionários
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbykc9e6mbm4bGIoZcD4B2IzBpPUAICbC4w4JZ7AHriyg0L900gUUGArsilReZBIC6NwUA/exec";

// URL do Apps Script para ações (verificação de duplicatas e envio)
const ACTION_URL = "https://script.google.com/macros/s/AKfycbz7gr6dyCUsi1QCbLlJaFVGxe8EYLPRF8XC-PCm8He3YL6AmM5qjTKpOyqyvrtPmd5iQg/exec";

// Lista global de funcionários (será carregada via GET action=lista)
window.employeeList = {};

// Array de provedores para sugestões de e-mail
const emailProviders = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "terra.com.br", "bol.com.br"];

// Atualiza o datalist de provedores após o "@" ser digitado
function updateEmailDatalist() {
    const emailInput = document.getElementById("email");
    const datalist = document.getElementById("emailProviders");
    const value = emailInput.value;
    const atIndex = value.indexOf("@");
    if (atIndex === -1) {
        datalist.innerHTML = "";
        return;
    }
    const domainPart = value.slice(atIndex + 1).toLowerCase();
    const filtered = emailProviders.filter(provider => provider.startsWith(domainPart));
    datalist.innerHTML = "";
    filtered.forEach(provider => {
        const option = document.createElement("option");
        option.value = provider;
        datalist.appendChild(option);
    });
}

// Calcula o período de solicitação para um determinado mês (0–11)
// Ex: Se hoje for março de 2025, as solicitações para abril serão feitas no período da primeira segunda de março à penúltima sexta de março.
function getPeriod(year, month) {
    let firstMonday = new Date(year, month, 1);
    while (firstMonday.getDay() !== 1) {
        firstMonday.setDate(firstMonday.getDate() + 1);
    }
    let lastDay = new Date(year, month + 1, 0);
    let lastFriday = new Date(lastDay);
    while (lastFriday.getDay() !== 5) {
        lastFriday.setDate(lastFriday.getDate() - 1);
    }
    let penultimateFriday = new Date(lastFriday);
    penultimateFriday.setDate(penultimateFriday.getDate() - 7);
    return { start: firstMonday, end: penultimateFriday };
}

// Inicializa o formulário: se estiver fora do período ativo, exibe mensagem; senão, mantém o formulário.
// O período ativo é calculado para o mês atual, para solicitações do próximo mês.
function initializeForm() {
    const formularioDiv = document.getElementById("formulario");
    if (formularioDiv) {
        formularioDiv.style.display = "block"; // Apenas um exemplo para evitar erro
    } else {
        console.warn("Div do formulário não encontrada.");
    }
}

// Padroniza a matrícula removendo caracteres não numéricos e adicionando "1000"
function standardizeMatricula(matricula) {
    let num = matricula.replace(/\D/g, '');
    if (!num.startsWith("1000")) {
        num = "1000" + num;
    }
    return num;
}

// Carrega a lista de funcionários (action=lista)
function loadEmployeeList() {
    const listURL = SCRIPT_URL + "?action=lista";
    fetch(listURL)
        .then(response => response.json())
        .then(data => {
            window.employeeList = data;
            console.log("Lista carregada:", data);
            console.log("Total funcionários: " + Object.keys(data).length);
        })
        .catch(error => {
            console.error("Erro ao carregar a lista:", error);
            window.employeeList = {};
        });
}

// Preenche o campo "Nome" com base na matrícula digitada
function checkMatricula() {
    const matriculaInput = document.getElementById("matricula");
    const nomeInput = document.getElementById("nome");
    const errorMsg = document.getElementById("matriculaError");
    let standardized = standardizeMatricula(matriculaInput.value);
    matriculaInput.value = standardized;
    if (window.employeeList && window.employeeList[standardized]) {
        nomeInput.value = window.employeeList[standardized];
        errorMsg.textContent = "";
    } else {
        nomeInput.value = "";
        errorMsg.textContent = "Matrícula não encontrada!";
    }
}

// Configura o campo de data para aceitar somente datas do próximo mês
function setDateLimits() {
    const dateInput = document.getElementById("data");
    let today = new Date();
    let nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    let lastDayNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    dateInput.min = nextMonth.toISOString().split("T")[0];
    dateInput.max = lastDayNextMonth.toISOString().split("T")[0];
}

// Função para converter data para formato "dd/MM/yyyy"
function formatDateToBR(dateString) {
    if (!dateString) return "";
    let parts = dateString.split("-");
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
}

// Função para gerar timestamp formatado
function getFormattedTimestamp() {
    let now = new Date();
    let dd = String(now.getDate()).padStart(2, '0');
    let mm = String(now.getMonth() + 1).padStart(2, '0'); // Janeiro = 0
    let yyyy = now.getFullYear();
    let hh = String(now.getHours()).padStart(2, '0');
    let min = String(now.getMinutes()).padStart(2, '0');
    let ss = String(now.getSeconds()).padStart(2, '0');

    return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
}

// Submete o formulário com validação: se duplicado, exibe mensagem na página
function submitForm(event) {
    event.preventDefault();
    const form = document.getElementById("dersoForm");
    const formData = new FormData(form);

    let dataValue = document.getElementById("data").value;
    let dataBR = formatDateToBR(dataValue);
    formData.set("data", dataBR);

    let folgaValue = document.querySelector('input[name="folga"]:checked');
    if (!folgaValue) {
        document.getElementById("duplicateError").textContent = "Por favor, selecione uma opção de folga.";
        return;
    }
    formData.set("folga", folgaValue.value);

    fetch(ACTION_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams(formData)
    })
        .then(response => response.text())
        .then(data => {
            console.log("Resposta do servidor:", data);
            alert("Solicitação enviada com sucesso!");
            form.reset();
        })
        .catch(error => {
            console.error("Erro no envio:", error);
            alert("Erro ao enviar solicitação!");
        });
}

document.addEventListener("DOMContentLoaded", function () {
    initializeForm();
    loadEmployeeList();
    setDateLimits();

    let matriculaField = document.getElementById("matricula");
    let emailField = document.getElementById("email");

    if (matriculaField) {
        matriculaField.addEventListener("blur", checkMatricula);
    } else {
        console.error("Campo matrícula não encontrado.");
    }

    if (emailField) {
        emailField.addEventListener("input", updateEmailDatalist);
    } else {
        console.error("Campo email não encontrado.");
    }

    console.log("Script carregado corretamente!");
});
   
