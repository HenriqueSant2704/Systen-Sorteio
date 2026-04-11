/* =====================================================================

   VARIÁVEIS GLOBAIS E ESTADO DA TELA

====================================================================*/

let participantesGlobais = [];
let participantesFiltrados = [];
let ganhadoresGlobais = [];
let ganhadoresFiltrados = [];
let exibindoGanhadores = false;

let paginaAtual = 1;
const limitePorPagina = 12;

const btnAlternarLista = document.getElementById('btnAlternarLista');
const inputBusca = document.getElementById('inputBusca');
const btnSortear = document.querySelector('.sortear');

/* =====================================================================

   ROTA: BUSCAR DADOS DO SERVIDOR (Participantes e Ganhadores)

====================================================================*/

async function carregarDados() {
    try {
        const resPart = await fetch('https://systen-sorteio-production.up.railway.app/api/participantes');
        const dadosPart = await resPart.json();
        if (dadosPart.sucesso) {
            participantesGlobais = dadosPart.participantes;
            if (!inputBusca || inputBusca.value.trim() === '') {
                participantesFiltrados = [...participantesGlobais];
            }
        }

        try {
            const resGanh = await fetch('https://systen-sorteio-production.up.railway.app/api/ganhadores');
            const dadosGanh = await resGanh.json();
            if (dadosGanh.sucesso) {
                ganhadoresGlobais = dadosGanh.ganhadores || [];
                if (!inputBusca || inputBusca.value.trim() === '') {
                    ganhadoresFiltrados = [...ganhadoresGlobais]; 
                }
            }
        } catch (e) { }

        verificarBotaoGanhadores();
        atualizarContadorTopo();
        renderizarPagina(paginaAtual);
    } catch (erro) {
        console.error("Erro de conexão com o servidor:", erro);
    }
}

function verificarBotaoGanhadores() {
    if (btnAlternarLista) {
        if (ganhadoresGlobais.length > 0) {
            btnAlternarLista.style.display = 'flex';
        } else {
            btnAlternarLista.style.display = 'none';
        }
    }
}

function atualizarContadorTopo() {
    const quantParticipanteSpan = document.querySelector('.quant-participante .quant');
    if (quantParticipanteSpan) {
        if (exibindoGanhadores) {
            const palavra = ganhadoresGlobais.length === ganhadoresFiltrados.length ? "registrados" : "encontrados";
            quantParticipanteSpan.textContent = `Visualizando o histórico de ${ganhadoresFiltrados.length} ganhadores ${palavra}.`;
        } else {
            const palavra = participantesGlobais.length === participantesFiltrados.length ? "cadastrados" : "encontrados";
            quantParticipanteSpan.textContent = `Gerencie os ${participantesFiltrados.length} participantes ${palavra}.`;
        }
    }
}

/* =====================================================================

   LÓGICA DE INVERTER A TELA E PESQUISA (EVENTOS DE TELA)

====================================================================*/

document.addEventListener('DOMContentLoaded', () => {
    carregarDados();

    if (btnAlternarLista) {
        btnAlternarLista.addEventListener('click', () => {
            exibindoGanhadores = !exibindoGanhadores;
            paginaAtual = 1;

            if (inputBusca) inputBusca.value = '';
            participantesFiltrados = [...participantesGlobais];
            ganhadoresFiltrados = [...ganhadoresGlobais];

            if (exibindoGanhadores) {
                btnAlternarLista.querySelector('span').textContent = 'Ver Participantes';
                if (btnSortear) btnSortear.style.display = 'none'; 
                if (inputBusca) inputBusca.placeholder = 'Buscar ganhador...'; 
            } else {
                btnAlternarLista.querySelector('span').textContent = 'Ver Ganhadores';
                if (btnSortear) btnSortear.style.display = 'flex';
                if (inputBusca) inputBusca.placeholder = 'Buscar participante...';
            }

            atualizarContadorTopo();
            renderizarPagina(1);
        });
    }

    if (inputBusca) {
        inputBusca.addEventListener('input', function (event) {
            const termoDigitado = event.target.value.toLowerCase().trim();

            if (exibindoGanhadores) {
                if (termoDigitado === '') {
                    ganhadoresFiltrados = [...ganhadoresGlobais];
                } else {
                    ganhadoresFiltrados = ganhadoresGlobais.filter(ganhador => {
                        const todosOsDados = Object.values(ganhador).join(' ').toLowerCase();
                        return todosOsDados.includes(termoDigitado);
                    });
                }
            } else {
                if (termoDigitado === '') {
                    participantesFiltrados = [...participantesGlobais];
                } else {
                    participantesFiltrados = participantesGlobais.filter(participante => {
                        const todosOsDados = Object.values(participante).join(' ').toLowerCase();
                        return todosOsDados.includes(termoDigitado);
                    });
                }
            }

            atualizarContadorTopo();
            renderizarPagina(1);
        });
    }
});

/* =====================================================================

   LÓGICA DO MODAL DETALHES DE PARTICIPANTES (Olhinho)

====================================================================*/

const modal = document.getElementById('modalParticipante');
const btnFechar = document.getElementById('btnFecharModal');

function abrirModal() { modal.classList.add('ativo'); }
function fecharModal() { modal.classList.remove('ativo'); }

if(btnFechar) btnFechar.addEventListener('click', fecharModal);

if(modal) modal.addEventListener('click', function (event) {
    if (event.target === this) fecharModal();
});

document.addEventListener('click', function (event) {
    const botaoVer = event.target.closest('.btn-ver');

    if (botaoVer) {
        const identificador = botaoVer.getAttribute('data-id');

        const listaBusca = exibindoGanhadores ? ganhadoresFiltrados : participantesFiltrados;

        const participante = listaBusca.find(p =>
            p.id == identificador ||
            p._id == identificador ||
            p.numerosorte == identificador ||
            p.numero_sorte == identificador
        );

        if (participante) {
            document.getElementById('modAvatar').textContent = pegarIniciais(participante.nomecompleto || participante.nome);
            document.getElementById('modNome').textContent = participante.nomecompleto || participante.nome || "Não informado";
            document.getElementById('modTicket').textContent = participante.numerosorte || participante.numero_sorte || "---";

            document.getElementById('modCpf').textContent = participante.CPF || participante.cpf || participante.cpf || "Não informado";
            document.getElementById('modCidade').textContent = participante.cidade || participante.cidade || "Não informada";
            document.getElementById('modTelefone').textContent = participante.telefone || participante.telefone || "Não informado";
            document.getElementById('modInstagram').textContent = participante.instagram || participante.instagram || "Não informado";

            let tipoPix = participante.tipopix || participante.tipo_pix;
            document.getElementById('modTipoPix').textContent = tipoPix ? tipoPix.toUpperCase() : "PIX";
            document.getElementById('modChavePix').textContent = participante.chavepix || participante.chave_pix || "Não informada";
        }
        abrirModal();
    }
});

/* =====================================================================

   ATUALIZAÇÃO SILENCIOSA (POLLING) - 5 SEGUNDOS

====================================================================*/

setInterval(() => {
    const modalDetalhesFechado = modal && !modal.classList.contains('ativo');
    const modalVencedor = document.getElementById('modalVencedor');
    const modalVencedorFechado = modalVencedor && !modalVencedor.classList.contains('ativo');
    const naoEstaPesquisando = inputBusca && inputBusca.value.trim() === '';

    if (naoEstaPesquisando && modalDetalhesFechado && modalVencedorFechado) {
        carregarDados();
    }
}, 5000);

/* =====================================================================

   LÓGICA DO SORTEIO (COM SALVAMENTO NO BANCO E SUSPENSE)

====================================================================*/


const modalVencedor = document.getElementById('modalVencedor');
const btnFecharVencedor = document.getElementById('btnFecharVencedor');

function abrirModalVencedor() { modalVencedor.classList.add('ativo'); }
function fecharModalVencedor() { modalVencedor.classList.remove('ativo'); }

if (btnFecharVencedor) btnFecharVencedor.addEventListener('click', fecharModalVencedor);
if (modalVencedor) modalVencedor.addEventListener('click', function (event) {
    if (event.target === this) fecharModalVencedor();
});

if(btnSortear) {
    btnSortear.addEventListener('click', () => {
        if (btnSortear.classList.contains('botao-desativado')) return;

        if (participantesGlobais.length === 0) {
            alert("Não há participantes cadastrados para sortear!");
            return;
        }

        const participantesElegiveis = participantesGlobais.filter(participante => {
            const idPart = participante.Id || participante.id;
      
            return !ganhadoresGlobais.some(ganhador => ganhador.id == idPart);
        });

        if (participantesElegiveis.length === 0) {
            alert("Todos os participantes cadastrados já foram sorteados!");
            return;
        }
  

        const iconeTrofeuOriginal = `<img src="../../Assets/Iconis/trophy.png" alt="">`;
        btnSortear.classList.add('botao-desativado');

        btnSortear.innerHTML = `
            <img src="../../Assets/Iconis/dices.png" alt="" class="animar-icone">
            Sorteando...
        `;

       setTimeout(async () => {
            const indiceSorteado = Math.floor(Math.random() * participantesElegiveis.length);
            const ganhador = participantesElegiveis[indiceSorteado];

            try {
                
                const resposta = await fetch('https://systen-sorteio-production.up.railway.app/api/ganhadores', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        participante_id: ganhador.Id || ganhador.id,
                        numero_sorte: ganhador.numerosorte,
                        nome: ganhador.nomecompleto
                    })
                });

                if (!resposta.ok) throw new Error("Servidor não respondeu com sucesso.");

                console.log("Ganhador salvo com segurança no banco!");
                carregarDados();

                document.getElementById('vencedorNome').textContent = ganhador.nomecompleto;
                document.getElementById('vencedorTicket').textContent = ganhador.numerosorte;
                document.getElementById('vencedorCidade').textContent = ganhador.cidade || "Não informada";

                let telefoneProtegido = ganhador.telefone || "---";
                if (telefoneProtegido !== "---" && telefoneProtegido.length >= 14) {
                    telefoneProtegido = telefoneProtegido.replace(/(\d{3})-(\d{2})/, '***-**');
                }
                document.getElementById('vencedorTelefone').textContent = telefoneProtegido;

                btnSortear.innerHTML = `${iconeTrofeuOriginal} Sortear Ganhador`;
                btnSortear.classList.remove('botao-desativado');

                abrirModalVencedor();

            } catch (erro) {
               
                console.error("Erro CRÍTICO ao salvar no banco:", erro);
                alert("⚠️ ATENÇÃO: Falha de conexão com o servidor! O sorteio foi cancelado por segurança. Verifique a internet e tente sortear novamente.");
                
            
                btnSortear.innerHTML = `${iconeTrofeuOriginal} Sortear Ganhador`;
                btnSortear.classList.remove('botao-desativado');
            }
        }, 3000);
    });
}

/* =====================================================================

   RENDERIZAR CARDS NA TELA

====================================================================*/

function renderizarPagina(numeroPagina) {
    paginaAtual = numeroPagina;
    const containerLista = document.querySelector('.container-lista');


    const listaParaDesenhar = exibindoGanhadores ? ganhadoresFiltrados : participantesFiltrados;

    if (listaParaDesenhar.length === 0) {
        containerLista.style.justifyContent = 'center';
        containerLista.innerHTML = `
            <div class="circulo">
                <img src="../../Assets/Iconis/group.png" alt="Grupo">
            </div>
            <p>${exibindoGanhadores ? 'Nenhum ganhador registrado.' : 'Nenhum participante encontrado.'}</p>
            <span>${exibindoGanhadores && (!inputBusca || inputBusca.value.trim() === '') ? '' : 'Tente pesquisar por outro termo.'}</span>
        `;
        atualizarRodapePaginacao(0, 0, listaParaDesenhar.length);
        return;
    }

    containerLista.style.justifyContent = 'flex-start';
    containerLista.innerHTML = '<div class="grid-cards"></div>';
    const grid = containerLista.querySelector('.grid-cards');

    const inicio = (paginaAtual - 1) * limitePorPagina;
    const fim = inicio + limitePorPagina;
    const itensDaPagina = listaParaDesenhar.slice(inicio, fim);

    const iconeOlho = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        </svg>
    `;

    itensDaPagina.forEach((item, index) => {
        const iniciais = pegarIniciais(item.nomecompleto || item.nome);
        const classeExtra = exibindoGanhadores ? 'card-ganhador' : '';

        let badgeHtml = '';
        if (exibindoGanhadores) {
            const posicao = ganhadoresGlobais.indexOf(item) + 1;

            let classeCores = 'posicao-neutra';
            if (posicao === 1) classeCores = 'posicao-1';
            else if (posicao === 2) classeCores = 'posicao-2';
            else if (posicao === 3) classeCores = 'posicao-3';

            badgeHtml = `<div class="badge-posicao ${classeCores}">${posicao}º</div>`;
        }

        const cardHtml = `
            <div class="card-participante ${classeExtra}">
                ${badgeHtml} 
                <div class="card-topo">
                    <div class="avatar">${iniciais}</div>
                    <div class="info-user">
                        <span class="nome">${item.nomecompleto || item.nome}</span>
                        <span class="cidade">${item.cidade || item.cidade || "Não informada"}</span>
                    </div>
                </div>
                <div class="linha-divisoria"></div>
                <div class="card-base">
                    <div class="sorte-box">
                        <span class="label">Nº SORTE</span>
                        <span class="numero">${item.numerosorte || item.numero_sorte}</span>
                    </div>
                    <button class="btn-ver" title="Ver detalhes" data-id="${item.id || item._id || item.numerosorte || item.numero_sorte}">
                        ${iconeOlho}
                    </button>
                </div>
            </div>
        `;
        grid.insertAdjacentHTML('beforeend', cardHtml);
    });

    atualizarRodapePaginacao(inicio + 1, Math.min(fim, listaParaDesenhar.length), listaParaDesenhar.length);
}

function atualizarRodapePaginacao(inicioItem, fimItem, totalItens) {
    const totalPaginas = Math.ceil(totalItens / limitePorPagina) || 1;

    document.querySelector('.quant-pagina span').textContent = `Mostrando ${totalItens === 0 ? 0 : inicioItem} a ${fimItem} de ${totalItens}`;
    document.getElementById('info-pagina').textContent = `Página ${paginaAtual} de ${totalPaginas}`;

    const btnAnterior = document.getElementById('btn-anterior');
    const btnProximo = document.getElementById('btn-proximo');

    btnAnterior.style.opacity = paginaAtual === 1 ? '0.5' : '1';
    btnAnterior.style.cursor = paginaAtual === 1 ? 'not-allowed' : 'pointer';

    btnProximo.style.opacity = paginaAtual === totalPaginas ? '0.5' : '1';
    btnProximo.style.cursor = paginaAtual === totalPaginas ? 'not-allowed' : 'pointer';
}

document.getElementById('btn-anterior').addEventListener('click', () => {
    if (paginaAtual > 1) renderizarPagina(paginaAtual - 1);
});

document.getElementById('btn-proximo').addEventListener('click', () => {
    const total = exibindoGanhadores ? ganhadoresFiltrados.length : participantesFiltrados.length;
    const totalPaginas = Math.ceil(total / limitePorPagina);
    if (paginaAtual < totalPaginas) renderizarPagina(paginaAtual + 1);
});

function pegarIniciais(nomeCompleto) {
    if (!nomeCompleto) return "PA";
    const partes = nomeCompleto.trim().split(" ");
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}