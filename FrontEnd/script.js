/*===========================================================================

    Mascaras de Formatação

============================================================================*/

/* ================= CPF =================*/

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


/* =================================================================

    Validar paddão matemático do CPF

====================================================================*/

function validarCPFMatematico(cpf) {
    cpf = cpf.replace(/\D/g, "");
    if (cpf.length !== 11 || !!cpf.match(/^(\d)\1{10}$/)) return false;

    let soma = 0, resto;

    for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;

    soma = 0;

    for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;

    return true;
}

/* ================= TELEFONE =================*/

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

/* =================================================================================

    Validar paddão matemático do TELEFONE (DDD, 9º dígito, números repetidos)

=====================================================================================*/

function validarTelefoneReal(telefone) {

    const tel = telefone.replace(/\D/g, "");

    if (tel.length !== 11) return false;

    if (!!tel.match(/^(\d)\1{10}$/)) return false;

    const ddd = parseInt(tel.substring(0, 2));
    if (ddd < 11 || ddd > 99) return false;

    if (tel.charAt(2) !== "9") return false;

    return true;
}

/* ================= Nome e Cidade =================*/

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

/*===========================================================================

    Ação do Botão Continuar / Finalizar (COM VALIDAÇÃO NO BANCO)

============================================================================*/


let processandoClique = false;

botao.addEventListener("click", async (e) => {
    e.preventDefault();

   
    if (processandoClique) return; 

    
    processandoClique = true;

    if (!validarEtapaAtual()) {
        processandoClique = false;
        return;
    }

    const textoOriginal = textoBotao.textContent;
    textoBotao.textContent = "Verificando...";
    botao.disabled = true;

    const passouNoBanco = await validarEtapaNoBanco(etapaAtual);

    textoBotao.textContent = textoOriginal;
    botao.disabled = false;


    if (!passouNoBanco) {
        processandoClique = false; 
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
        
        processandoClique = false;

    } else {
        
        await enviarDadosParaBackend();
        
       
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

/* =============================================================

    FUNÇÕES DE COMUNICAÇÃO COM O BANCO

 =================================================================*/


async function validarEtapaNoBanco(etapa) {
    let dadosParaValidar = {};

    document.querySelectorAll(".erro").forEach(span => span.style.display = "none");
    document.querySelectorAll("input").forEach(input => input.style.borderColor = "");


    if (etapa === 0) {
        dadosParaValidar = { cpf: document.getElementById("cpfInput").value };
    } else if (etapa === 1) {
        const emailInput = document.getElementById("emailInput") || document.querySelector('input[type="email"]');
        dadosParaValidar = {
            telefone: document.getElementById("telefoneInput").value,
            email: emailInput.value
        };
    } else if (etapa === 2) {
        dadosParaValidar = { chavePix: document.getElementById("inputPix").value };
    }

    try {
        const resposta = await fetch("http://127.0.0.1:3000/api/validar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dadosParaValidar)
        });

        const resultado = await resposta.json();

        if (resultado.duplicado) {

            mostrarErroDuplicado(resultado.campo, resultado.mensagem);
            return false;
        }

        return true;
    } catch (erro) {
        console.error("Erro ao validar no banco:", erro);
        return false;
    }
}


function mostrarErroDuplicado(campo, mensagem) {
    let inputAlvo;
    let erroAlvo;

    if (campo === 'cpf') {
        inputAlvo = document.getElementById("cpfInput");
        erroAlvo = document.getElementById("erroCpf");
    } else if (campo === 'telefone') {
        inputAlvo = document.getElementById("telefoneInput");
        erroAlvo = document.getElementById("erroTelefone");
    } else if (campo === 'email') {
        inputAlvo = document.getElementById("emailInput") || document.querySelector('input[type="email"]');
        erroAlvo = document.getElementById("erroEmail");
    } else if (campo === 'chavePix') {
        inputAlvo = document.getElementById("inputPix");
        erroAlvo = document.getElementById("erroPix");
    }

    if (inputAlvo && erroAlvo) {
        inputAlvo.style.borderColor = "red";
        erroAlvo.textContent = mensagem;
        erroAlvo.style.display = "block";
        inputAlvo.focus();
    }
}

function validarEtapaAtual() {
    const inputs = etapasForm[etapaAtual].querySelectorAll("input");

    /* ==============================================================

        1. FAXINA: Limpa bordas vermelhas e erros antes de verificar

    ============================================================== */

    for (let input of inputs) {
        input.style.borderColor = "";
    }
    const mensagensErro = etapasForm[etapaAtual].querySelectorAll(".erro");
    for (let erro of mensagensErro) {
        erro.style.display = "none";
    }

    /* =================================================================

        2. VERIFICAÇÕES

    =====================================================================*/


    for (let input of inputs) {

        
        if (input.value.trim() === "") {
            input.style.borderColor = "red";
            input.focus();
            return false;
        }

        
        if (input.id === "cpfInput") {
            if (!validarCPFMatematico(input.value)) {
                input.style.borderColor = "red";
                const erroCpf = document.getElementById("erroCpf");
                if (erroCpf) {
                    erroCpf.textContent = "CPF inválido! Digite um CPF real.";
                    erroCpf.style.display = "block";
                }
                input.focus();
                return false;
            }
        }

        
        if (input.id === "telefoneInput") {
            if (!validarTelefoneReal(input.value)) {
                input.style.borderColor = "red";
                const erroTelefone = document.getElementById("erroTelefone");
                if (erroTelefone) {
                    erroTelefone.textContent = "Telefone inválido! Use o formato (00) 90000-0000.";
                    erroTelefone.style.display = "block";
                }
                input.focus();
                return false;
            }
        }

/*===========================================================

     VALIDAÇÃO: NOME E SOBRENOME

=============================================================*/

        if (input.id === "nomeInput") {
            const nomeLimpo = input.value.trim();
            const palavras = nomeLimpo.split(/\s+/); 

            if (palavras.length < 2 || nomeLimpo.length < 5) {
                input.style.borderColor = "red";
                const erroNome = document.getElementById("erroNome");
                if (erroNome) {
                    erroNome.textContent = "Por favor, digite seu nome e sobrenome.";
                    erroNome.style.display = "block";
                }
                input.focus();
                return false;
            }
        }

       
        if (input.type === "email" && input.id !== "inputPix") {
            if (!emailValido(input.value)) {
                input.style.borderColor = "red";
                const erroEmail = document.getElementById("erroEmail");
                if (erroEmail) {
                    erroEmail.textContent = "Digite um email válido (ex: nome@email.com)";
                    erroEmail.style.display = "block";
                }
                input.focus();
                return false;
            }
        }

/* ==============================================================

     Validação da Chave PIX (AGORA BLINDADA!)

 =============================================================*/

        if (input.id === "inputPix") {
            const erroPix = document.getElementById("erroPix");

            
            if (tipoPix === "email" && !emailValido(input.value)) {
                input.style.borderColor = "red";
                if (erroPix) {
                    erroPix.textContent = "Digite um email válido para o PIX";
                    erroPix.style.display = "block";
                }
                input.focus();
                return false;
            }

        
            if (tipoPix === "cpf" && !validarCPFMatematico(input.value)) {
                input.style.borderColor = "red";
                if (erroPix) {
                    erroPix.textContent = "Chave PIX inválida! Digite um CPF real.";
                    erroPix.style.display = "block";
                }
                input.focus();
                return false;
            }

            
            if (tipoPix === "telefone" && !validarTelefoneReal(input.value)) {
                input.style.borderColor = "red";
                if (erroPix) {
                    erroPix.textContent = "Chave PIX inválida! Use um número real.";
                    erroPix.style.display = "block";
                }
                input.focus();
                return false;
            }
        }
    }

    return true; 
}

/* =================================================================

    Integração com o Banco de Dados (Backend)

====================================================================*/

async function enviarDadosParaBackend() {

    const textoOriginal = textoBotao.textContent;
    textoBotao.textContent = "Processando...";
    botao.disabled = true;

    const emailValor = document.getElementById("emailInput")
        ? document.getElementById("emailInput").value
        : document.querySelector('input[type="email"]').value;

    const instagramValor = document.getElementById("instagramInput")
        ? document.getElementById("instagramInput").value
        : document.querySelector('input[placeholder="@seuinstagram"]').value;


    const dadosFormulario = {
        nomeCompleto: document.getElementById("nomeInput").value,
        cpf: document.getElementById("cpfInput").value,
        cidade: document.getElementById("cidadeInput").value,
        telefone: document.getElementById("telefoneInput").value,
        email: emailValor,
        instagram: instagramValor,
        tipoPix: tipoPix,
        chavePix: document.getElementById("inputPix").value
    };

    try {

        const resposta = await fetch("http://127.0.0.1:3000/api/cadastro", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dadosFormulario)
        });

        const resultado = await resposta.json();


        if (resultado.sucesso) {

            document.getElementById("numeroSorte").textContent = resultado.numeroSorte;

            document.querySelector("form").style.display = "none";
            document.getElementById("telaSucesso").style.display = "block";
        } else {
            alert("Erro ao salvar cadastro: " + resultado.mensagem);
            textoBotao.textContent = textoOriginal;
            botao.disabled = false;
        }

    } catch (erro) {
        console.error("Erro ao enviar dados:", erro);
        alert("Falha na conexão! O servidor (backend) está rodando?");
        textoBotao.textContent = textoOriginal;
        botao.disabled = false;
        processandoClique = false;
    }
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