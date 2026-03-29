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


botaoVoltar.style.display = "none";

botao.addEventListener("click", (e) => {
    e.preventDefault();

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
        alert("Cadastro finalizado 🚀");
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


/* =================================================================

    Seleciona as opções de pagamento e o input correspondente 

====================================================================*/

const opcoes = document.querySelectorAll(".opcao");
const inputPix = document.getElementById("inputPix");

opcoes.forEach(opcao => {
    opcao.addEventListener("click", () => {


        opcoes.forEach(o => o.classList.remove("ativa"));


        opcao.classList.add("ativa");

        const tipo = opcao.dataset.tipo;


        if (tipo === "email") {
            inputPix.placeholder = "seu@email.com";
        }

        if (tipo === "cpf") {
            inputPix.placeholder = "xxx.xxx.xxx-xx";
        }

        if (tipo === "telefone") {
            inputPix.placeholder = "(00) 00000-0000";
        }

        if (tipo === "aleatoria") {
            inputPix.placeholder = "Chave aleatória";
        }
    });
});

/* =================================================================



====================================================================*/