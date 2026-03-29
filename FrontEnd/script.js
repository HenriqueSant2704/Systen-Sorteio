/*===========================================================================

    Mascaras de Formatação

============================================================================*/

// ================= CPF =================
const cpfInput = document.getElementById("cpfInput");

function mascaraCPF(valor) {
    valor = valor.replace(/\D/g, "");
    valor = valor.slice(0, 11);

    valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
    valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
    valor = valor.replace(/(\d{3})(\d{1,2})$/, "$1-$2");

    return valor;
}

cpfInput.addEventListener("input", () => {
    cpfInput.value = mascaraCPF(cpfInput.value);
});

// ================= TELEFONE =================
const telefoneInput = document.getElementById("telefoneInput");

function mascaraTelefone(valor) {
    valor = valor.replace(/\D/g, "");
    valor = valor.slice(0, 11);

    valor = valor.replace(/^(\d{2})(\d)/g, "($1) $2");
    valor = valor.replace(/(\d{5})(\d)/, "$1-$2");

    return valor;
}

telefoneInput.addEventListener("input", () => {
    telefoneInput.value = mascaraTelefone(telefoneInput.value);
});

// ================= Nome e Cidade =================
const nomeInput = document.getElementById("nomeInput");
const cidadeInput = document.getElementById("cidadeInput");

function apenasLetras(valor) {
    return valor.replace(/[^a-zA-ZÀ-ÿ\s]/g, "");

}

nomeInput.addEventListener("input", () => {
    nomeInput.value = apenasLetras(nomeInput.value);
});

cidadeInput.addEventListener("input", () => {
    cidadeInput.value = apenasLetras(cidadeInput.value);
});


function aplicarMascaraPix(tipo, valor) {

    if (tipo === "cpf") {
        valor = valor.replace(/\D/g, "");
        return mascaraCPF(valor);
    }

    if (tipo === "telefone") {
        valor = valor.replace(/\D/g, "");
        return mascaraTelefone(valor);
    }

    return valor;
}

function emailValido(email) {
    const temArroba = email.includes("@");
    const temPonto = email.split("@")[1]?.includes(".");
    return temArroba && temPonto;
}

/*===========================================================================

    Barra de Progresso

============================================================================*/

let etapaAtual = 0;

const etapasForm = document.querySelectorAll(".etapa-form");
const etapasTopo = document.querySelectorAll(".etapa");
const linha = document.querySelector(".linha-preenchida");
const botao = document.getElementById("proximoButton");
const botaoVoltar = document.getElementById("voltarButton");
const textoBotao = document.getElementById("textoBotao");
const iconeBotao = document.getElementById("iconeBotao");
const erroEmail = document.getElementById("erroEmail");
const erroPix = document.getElementById("erroPix");

botaoVoltar.style.display = "none";

botao.addEventListener("click", (e) => {
    e.preventDefault();

    if (!validarEtapaAtual()) {
        return;
    }

    if (etapaAtual < etapasForm.length - 1) {

        etapasForm[etapaAtual].classList.remove("ativa");
        etapaAtual++;
        etapasForm[etapaAtual].classList.add("ativa");

        etapasTopo.forEach((etapa, index) => {
            if (index <= etapaAtual) {
                etapa.classList.add("ativa");
            }
        });

        let porcentagem = (etapaAtual / (etapasForm.length - 1)) * 100;
        linha.style.width = porcentagem + "%";

        botaoVoltar.style.display = etapaAtual === 0 ? "none" : "block";

        if (etapaAtual === etapasForm.length - 1) {
            textoBotao.textContent = "Finalizar Cadastro";
            botao.classList.add("finalizar");
            iconeBotao.style.display = "none";
        }

    } else {
        document.querySelector("form").style.display = "none";
        document.getElementById("telaSucesso").style.display = "block";
    }
});

botaoVoltar.addEventListener("click", () => {

    if (etapaAtual > 0) {

        etapasForm[etapaAtual].classList.remove("ativa");
        etapaAtual--;
        etapasForm[etapaAtual].classList.add("ativa");

        etapasTopo.forEach((etapa, index) => {
            if (index <= etapaAtual) {
                etapa.classList.add("ativa");
            } else {
                etapa.classList.remove("ativa");
            }
        });

        let porcentagem = (etapaAtual / (etapasForm.length - 1)) * 100;
        linha.style.width = porcentagem + "%";

        botaoVoltar.style.display = etapaAtual === 0 ? "none" : "block";

        textoBotao.textContent = "Continuar";
        botao.classList.remove("finalizar");
        iconeBotao.style.display = "block";
    }
});

function validarEtapaAtual() {
    const inputs = etapasForm[etapaAtual].querySelectorAll("input");

    for (let input of inputs) {

        if (input.value.trim() === "") {
            input.style.borderColor = "red";
            input.focus();
            return false;
        }

        if (input.type === "email") {
            if (!emailValido(input.value)) {
                input.style.borderColor = "red";

                erroEmail.textContent = "Digite um email válido (ex: nome@email.com)";
                erroEmail.style.display = "block";

                input.focus();
                return false;
            } else {
                erroEmail.style.display = "none";
            }
        }


        if (input.id === "cpfInput" && input.value.length < 14) {
            input.style.borderColor = "red";
            input.focus();
            return false;
        }


        if (input.id === "telefoneInput" && input.value.length < 15) {
            input.style.borderColor = "red";
            input.focus();
            return false;
        }

        if (input.id === "inputPix") {

            if (tipoPix === "email") {
                if (!emailValido(input.value)) {
                    input.style.borderColor = "red";

                    erroPix.textContent = "Digite um email válido para o PIX";
                    erroPix.style.display = "block";

                    input.focus();
                    return false;
                } else {
                    erroPix.style.display = "none";
                }
            }

            if (tipoPix === "cpf" && input.value.length < 14) {
                input.style.borderColor = "red";

                erroPix.textContent = "CPF incompleto";
                erroPix.style.display = "block";

                input.focus();
                return false;
            }

            if (tipoPix === "telefone" && input.value.length < 15) {
                input.style.borderColor = "red";

                erroPix.textContent = "Telefone incompleto";
                erroPix.style.display = "block";

                input.focus();
                return false;
            }

            erroPix.style.display = "none";
        }

        input.style.borderColor = "";
    }

    return true;
}

/* =================================================================

    Seleciona as opções de pagamento e o input correspondente 

====================================================================*/

const opcoes = document.querySelectorAll(".opcao");
const inputPix = document.getElementById("inputPix");

let tipoPix = "email";

opcoes.forEach(opcao => {
    opcao.addEventListener("click", () => {

        opcoes.forEach(o => o.classList.remove("ativa"));

        opcao.classList.add("ativa");

        tipoPix = opcao.dataset.tipo;

        inputPix.value = "";
        erroPix.style.display = "none";

        if (tipoPix === "email") {
            inputPix.placeholder = "seu@email.com";
        }

        if (tipoPix === "cpf") {
            inputPix.placeholder = "xxx.xxx.xxx-xx";
        }

        if (tipoPix === "telefone") {
            inputPix.placeholder = "(00) 00000-0000";
        }

        if (tipoPix === "aleatoria") {
            inputPix.placeholder = "Chave aleatória";
        }
    });
});

inputPix.addEventListener("input", () => {
    inputPix.value = aplicarMascaraPix(tipoPix, inputPix.value);
});

/* =================================================================

    Funções de Instrução

====================================================================*/

function mostrarInstrucoes() {

    document.querySelector('form').style.display = 'none';
    document.getElementById('areaInstrucoes').style.display = 'block'; 
}

function voltarParaFormulario() {

    document.getElementById('areaInstrucoes').style.display = 'none';
    document.querySelector('form').style.display = 'block'; 
}