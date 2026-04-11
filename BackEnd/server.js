const express = require('express');
const cors = require('cors');
const { pool } = require('./db'); 
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

/*===========================================================================

    Funções de Validação de Dados

============================================================================*/

function validarCPFMatematico(cpf) {
    if (!cpf) return false;
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

function validarTelefoneReal(telefone) {
    if (!telefone) return false;
    const tel = telefone.replace(/\D/g, "");
    if (tel.length !== 11) return false;
    if (!!tel.match(/^(\d)\1{10}$/)) return false;
    const ddd = parseInt(tel.substring(0, 2));
    if (ddd < 11 || ddd > 99) return false;
    if (tel.charAt(2) !== "9") return false;
    return true;
}

function validarNomeCompleto(nome) {
    if (!nome) return false;
    const nomeLimpo = nome.trim();
    const palavras = nomeLimpo.split(/\s+/);
    if (palavras.length < 2 || nomeLimpo.length < 5) return false;
    return true;
}

app.get('/', (req, res) => {
    res.send('🚀 API do Sorteio rodando perfeitamente no PostgreSQL!');
});

/* =====================================================================

    ROTA DE CADASTRO

 ====================================================================*/


app.post('/api/cadastro', async (req, res) => {
    try {
        const { nomeCompleto, cpf, cidade, telefone, email, instagram, tipoPix, chavePix } = req.body;

        if (!validarCPFMatematico(cpf)) return res.status(400).json({ sucesso: false, mensagem: "O CPF fornecido é matematicamente inválido." });
        if (!validarTelefoneReal(telefone)) return res.status(400).json({ sucesso: false, mensagem: "Telefone inválido!" });
        if (!validarNomeCompleto(nomeCompleto)) return res.status(400).json({ sucesso: false, mensagem: "Por favor, informe nome e sobrenome!" });

        
        const checkDuplicado = await pool.query(`
            SELECT CPF, Email, Telefone, ChavePix 
            FROM Participantes 
            WHERE CPF = $1 OR Email = $2 OR Telefone = $3 OR ChavePix = $4
            LIMIT 1
        `, [cpf, email, telefone, chavePix]);

        if (checkDuplicado.rows.length > 0) {
            const duplicado = checkDuplicado.rows[0];
            let msgErro = "Você já está cadastrado no sorteio!";
            
           
            if (duplicado.cpf === cpf || duplicado.CPF === cpf) msgErro = "Este CPF já está cadastrado no sorteio!";
            else if (duplicado.email === email || duplicado.Email === email) msgErro = "Este E-mail já foi utilizado em outro cadastro!";
            else if (duplicado.telefone === telefone || duplicado.Telefone === telefone) msgErro = "Este Telefone já está participando do sorteio!";
            else if (duplicado.chavepix === chavePix || duplicado.ChavePix === chavePix) msgErro = "Esta Chave PIX já está vinculada a outro participante!";
            
            return res.status(400).json({ sucesso: false, mensagem: msgErro });
        }

        let numeroSorte;
        let numeroUnico = false;

        while (!numeroUnico) {
            numeroSorte = Math.floor(1000 + Math.random() * 99999);
            const checkSorte = await pool.query(`SELECT NumeroSorte FROM Participantes WHERE NumeroSorte = $1 LIMIT 1`, [numeroSorte]);
            if (checkSorte.rows.length === 0) numeroUnico = true;
        }

        await pool.query(`
            INSERT INTO Participantes (NomeCompleto, CPF, Cidade, Telefone, Email, Instagram, TipoPix, ChavePix, NumeroSorte)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [nomeCompleto, cpf, cidade, telefone, email, instagram, tipoPix, chavePix, numeroSorte]);

        try {
            const primeiroNome = nomeCompleto.trim().split(" ")[0];
            const telefoneLimpo = telefone.replace(/\D/g, '');
            const telefoneParaEnvio = telefoneLimpo.startsWith("55") ? telefoneLimpo : "55" + telefoneLimpo;

            const msgRecibo = `✅ Cadastro concluído!\n\nGuarde seu número da sorte:\n\n🎟️ *[ ${numeroSorte} ]* 🎟️\n\nBoa sorte, *${primeiroNome}*!`;
            enviarMensagemEvolution(telefoneParaEnvio, msgRecibo);
        } catch (erroZap) {
            console.error('Aviso: Falha ao enviar o recibo automático pelo Zap:', erroZap);
        }
        
        res.status(201).json({ sucesso: true, numeroSorte: numeroSorte, mensagem: 'Cadastro realizado com sucesso!' });

    } catch (erro) {
        console.error(' Erro ao salvar cadastro:', erro);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    }
});

/* =====================================================================================

    ROTA DE VALIDAÇÃO (PASSO A PASSO)

 ============================================================================================ */

app.post('/api/validar', async (req, res) => {
    try {
        const { cpf, telefone, email, chavePix } = req.body;

        if (cpf && !validarCPFMatematico(cpf)) return res.json({ duplicado: true, campo: 'cpf', mensagem: 'O CPF fornecido é inválido!' });
        if (telefone && !validarTelefoneReal(telefone)) return res.json({ duplicado: true, campo: 'telefone', mensagem: 'Formato de telefone inválido!' });

        let query = `SELECT CPF, Telefone, Email, ChavePix FROM Participantes WHERE `;
        let conditions = [];
        let values = [];
        let counter = 1;

        if (cpf) { conditions.push(`CPF = $${counter++}`); values.push(cpf); }
        if (telefone) { conditions.push(`Telefone = $${counter++}`); values.push(telefone); }
        if (email) { conditions.push(`Email = $${counter++}`); values.push(email); }
        if (chavePix) { conditions.push(`ChavePix = $${counter++}`); values.push(chavePix); }

        if (conditions.length === 0) return res.json({ duplicado: false });

        query += conditions.join(' OR ') + ' LIMIT 1';
        const check = await pool.query(query, values);

        if (check.rows.length > 0) {
            const row = check.rows[0];
            if (cpf && (row.cpf === cpf || row.CPF === cpf)) return res.json({ duplicado: true, campo: 'cpf', mensagem: 'Este CPF já está cadastrado no sorteio!' });
            if (telefone && (row.telefone === telefone || row.Telefone === telefone)) return res.json({ duplicado: true, campo: 'telefone', mensagem: 'Este Telefone já está participando!' });
            if (email && (row.email === email || row.Email === email)) return res.json({ duplicado: true, campo: 'email', mensagem: 'Este E-mail já foi utilizado em outro cadastro!' });
            if (chavePix && (row.chavepix === chavePix || row.ChavePix === chavePix)) return res.json({ duplicado: true, campo: 'chavePix', mensagem: 'Esta Chave PIX já está vinculada!' });
        }

        res.json({ duplicado: false });
    } catch (erro) {
        console.error('Erro na validação:', erro);
        res.status(500).json({ erro: 'Erro no servidor' });
    }
});

/* =====================================================================

   ROTA: GERA CÓDIGO DE WHATSAPP E FAZ REENVIO AUTOMÁTICO

====================================================================*/

app.post('/api/gerar-codigo', async (req, res) => {
    try {
        const { telefone, isReenvio } = req.body;
        if (!telefone) return res.status(400).json({ sucesso: false, mensagem: "Telefone não informado." });

        const checkParticipante = await pool.query(`SELECT Telefone FROM Participantes WHERE Telefone = $1 LIMIT 1`, [telefone]);
        if (checkParticipante.rows.length > 0) {
            return res.status(400).json({ sucesso: false, mensagem: "Este WhatsApp já concluiu o cadastro no sorteio!" });
        }

        const telefoneLimpo = telefone.replace(/\D/g, '');
        const codigo = Math.floor(1000 + Math.random() * 9000).toString();

        await pool.query(`DELETE FROM Verificacoes_WhatsApp WHERE Telefone = $1`, [telefoneLimpo]);
        await pool.query(`INSERT INTO Verificacoes_WhatsApp (Telefone, Codigo) VALUES ($1, $2)`, [telefoneLimpo, codigo]);

        if (isReenvio) {
            const telefoneParaEnvio = telefoneLimpo.startsWith("55") ? telefoneLimpo : "55" + telefoneLimpo;
            const msgReenvio = `Seu novo código de verificação é:\n\n🔑 *${codigo}*\n\nVolte ao site e digite este código.`;
            enviarMensagemEvolution(telefoneParaEnvio, msgReenvio).catch(err => console.error("Erro no reenvio automático:", err));
        }

        res.json({ sucesso: true, mensagem: "Código gerado com sucesso." });
    } catch (erro) {
        console.error(' Erro ao gerar código WhatsApp:', erro);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    }
});

/* =====================================================================

   ROTA: CONFERIR CÓDIGO WHATSAPP (Verificação)

====================================================================*/

app.post('/api/conferir-codigo', async (req, res) => {
    try {
        const { telefone, codigo } = req.body;
        if (!telefone || !codigo) return res.status(400).json({ sucesso: false, mensagem: "Dados incompletos." });

        const telefoneLimpo = telefone.replace(/\D/g, '');

        const busca = await pool.query(`
            SELECT * FROM Verificacoes_WhatsApp 
            WHERE Telefone = $1 AND Codigo = $2 
            AND DataCriacao >= NOW() - INTERVAL '90 seconds'
            ORDER BY DataCriacao DESC LIMIT 1
        `, [telefoneLimpo, codigo]);

        if (busca.rows.length > 0) {
            await pool.query(`DELETE FROM Verificacoes_WhatsApp WHERE Telefone = $1`, [telefoneLimpo]);
            res.json({ sucesso: true, mensagem: "Código validado com sucesso!" });
        } else {
            res.status(400).json({ sucesso: false, mensagem: "Código incorreto. Tente novamente!" });
        }
    } catch (erro) {
        console.error('Erro ao conferir código WhatsApp:', erro);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    }
});

/* =====================================================================

    FUNÇÃO PARA ENVIAR MENSAGEM PELA EVOLUTION API 
    
==============================================================================*/


const EVOLUTION_URL = "http://localhost:8080";
const EVOLUTION_INSTANCIA = "RoboSorteio";
const EVOLUTION_API_KEY = "MiguelSenhaGlobal123";

async function enviarMensagemEvolution(telefone, texto) {
    try {
        const urlEnvio = `${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCIA}`;
        const payload = { number: telefone, textMessage: { text: texto } };

        const response = await fetch(urlEnvio, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("Resposta da Evolution:", data);
    } catch (erro) {
        console.error(" Erro na conexão com Evolution:", erro);
    }
}

/* =====================================================================

   ROTA WEBHOOK ESCUTA AS MENSAGENS QUE CHEGAM NA EVOLUTION

=========================================================================*/

app.post('/api/webhook/evolution/messages-upsert', async (req, res) => {
    console.log("🔔 WEBHOOK RECEBIDO!");
    res.status(200).send("OK");

    try {
        const payload = req.body;
        if (payload.event === "messages.upsert") {
            const msgData = payload.data;
            const telefoneComSufixo = msgData.key.remoteJid;

            if (telefoneComSufixo.includes("@g.us") || msgData.key.fromMe) return;

            let textoMensagem = "";
            if (msgData.message?.conversation) textoMensagem = msgData.message.conversation;
            else if (msgData.message?.extendedTextMessage) textoMensagem = msgData.message.extendedTextMessage.text;

            const msgEmMinusculo = textoMensagem.toLowerCase().trim();

           
            if (msgEmMinusculo.includes("validar meu número")) {
                const telefoneRealFull = telefoneComSufixo.replace("@s.whatsapp.net", "");
                const telefoneCom55 = telefoneRealFull.startsWith("55") ? telefoneRealFull : "55" + telefoneRealFull;
                const telefoneSem55 = telefoneRealFull.startsWith("55") ? telefoneRealFull.slice(2) : telefoneRealFull;

                const busca = await pool.query(`
                    SELECT Codigo FROM Verificacoes_WhatsApp 
                    WHERE (Telefone = $1 OR Telefone = $2)
                    AND DataCriacao >= NOW() - INTERVAL '60 seconds' 
                    ORDER BY DataCriacao DESC LIMIT 1
                `, [telefoneCom55, telefoneSem55]);

                if (busca.rows.length > 0) {
                    const respostaZap = `Seu código de verificação é:\n\n🔑 *${busca.rows[0].codigo || busca.rows[0].Codigo}*\n\nVolte ao site e digite este código.`;
                    await enviarMensagemEvolution(telefoneRealFull, respostaZap);
                } else {
                    const msgErroZap = `Não foi possível gerar o código.\n\nO número digitado no site é diferente deste WhatsApp ou o tempo de 60 segundos acabou.\n\nVolte ao site e tente novamente.`;
                    await enviarMensagemEvolution(telefoneRealFull, msgErroZap);
                }
            }

          
            else if (msgEmMinusculo.includes("meu numero da sorte") || msgEmMinusculo.includes("meu número da sorte")) {
                const telefoneRealFull = telefoneComSufixo.replace("@s.whatsapp.net", "");
                const telefoneSem55 = telefoneRealFull.startsWith("55") ? telefoneRealFull.slice(2) : telefoneRealFull;

                const buscaParticipante = await pool.query(`
                    SELECT NomeCompleto, NumeroSorte FROM Participantes 
                    WHERE REPLACE(REPLACE(REPLACE(REPLACE(Telefone, '(', ''), ')', ''), '-', ''), ' ', '') = $1
                    LIMIT 1
                `, [telefoneSem55]);

                if (buscaParticipante.rows.length > 0) {
                    const dados = buscaParticipante.rows[0];
                    const numSorte = dados.numerosorte || dados.NumeroSorte;
                    const msgRecuperacao = `Guarde seu número da sorte:\n\n🎟️ *[ ${numSorte} ]* 🎟️\n\nBoa sorte!`;
                    await enviarMensagemEvolution(telefoneRealFull, msgRecuperacao);
                } else {
                    const msgNaoEncontrado = `❌ *Não encontrado*\n\nNenhum cadastro concluído para este número.\n\nVolte ao site e finalize seu cadastro para participar do sorteio.`;
                    await enviarMensagemEvolution(telefoneRealFull, msgNaoEncontrado);
                }
            }

           
            else if (msgEmMinusculo === "help" || msgEmMinusculo === "ajuda" || msgEmMinusculo === "menu") {
                const telefoneRealFull = telefoneComSufixo.replace("@s.whatsapp.net", "");
                const msgAjuda = `📋 *Menu do Sorteio*\n\nCopie e envie uma das frases abaixo para mim:\n\n👉 *Validar meu número*\n(Para receber seu código de acesso)\n\n👉 *Meu numero da sorte*\n(Para ver o seu número do sorteio)`;
                await enviarMensagemEvolution(telefoneRealFull, msgAjuda);
            }

            
            else {
                if (msgEmMinusculo.length > 0) {
                    const telefoneRealFull = telefoneComSufixo.replace("@s.whatsapp.net", "");
                    const msgNaoReconhecida = `Mensagem não reconhecida.\n\nDigite a palavra abaixo para ver as opções:\n\n*AJUDA*`;
                    await enviarMensagemEvolution(telefoneRealFull, msgNaoReconhecida);
                }
            }
        }
    } catch (erro) {
        console.error("Erro no processamento do webhook:", erro);
    }
});

/* =====================================================================

   ROTA: BUSCAR TODOS OS PARTICIPANTES (PARA O PAINEL ADMIN)

====================================================================*/


app.get('/api/participantes', async (req, res) => {
    try {
        const busca = await pool.query(`
            SELECT Id, NomeCompleto, CPF, Cidade, Telefone, Email, Instagram, TipoPix, ChavePix, NumeroSorte 
            FROM Participantes 
            ORDER BY NomeCompleto ASC
        `);
        res.status(200).json({ sucesso: true, participantes: busca.rows });
    } catch (erro) {
        console.error('Erro ao buscar lista de participantes:', erro);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor ao buscar participantes.' });
    }
});

/* =====================================================================

   ROTA: SALVAR GANHADOR (POST) E ENVIAR MENSAGEM NO ZAP
   
====================================================================*/


app.post('/api/ganhadores', async (req, res) => {
    try {
        const { participante_id, nome, numero_sorte } = req.body;

        const verificacao = await pool.query(`SELECT Id FROM Ganhadores WHERE ParticipanteId = $1 LIMIT 1`, [participante_id]);
        if (verificacao.rows.length > 0) {
            return res.status(400).json({ sucesso: false, mensagem: 'Participante já foi sorteado!' });
        }

        await pool.query(`
            INSERT INTO Ganhadores (ParticipanteId, NomeCompleto, NumeroSorte)
            VALUES ($1, $2, $3)
        `, [participante_id, nome, numero_sorte]);

        const buscaTelefone = await pool.query(`SELECT Telefone FROM Participantes WHERE Id = $1 LIMIT 1`, [participante_id]);

        if (buscaTelefone.rows.length > 0) {
            const telefoneDB = buscaTelefone.rows[0].telefone || buscaTelefone.rows[0].Telefone;
            
            if (telefoneDB) {
                const primeiroNome = nome.trim().split(" ")[0];
                const telefoneLimpo = telefoneDB.replace(/\D/g, '');
                const telefoneParaEnvio = telefoneLimpo.startsWith("55") ? telefoneLimpo : "55" + telefoneLimpo;

                const msgGanhador = `🏆 *VOCÊ GANHOU!* 🏆\n\nOlá, *${primeiroNome}*! O seu número da sorte ( *${numero_sorte}* ) acabou de ser sorteado no nosso sistema.\n\nParabéns! 🎉 Compareça ao nosso local de atendimento para retirar o seu prêmio.\n\n*Equipe Netico*`;
                enviarMensagemEvolution(telefoneParaEnvio, msgGanhador).catch(err => console.error("Erro no envio do prêmio:", err));
            }
        }

        res.json({ sucesso: true, mensagem: 'Ganhador salvo e notificado com sucesso!' });
    } catch (erro) {
        console.error('Erro ao salvar ganhador:', erro);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    }
});

/* =====================================================================

   ROTA: BUSCAR GANHADORES (GET)

====================================================================*/


app.get('/api/ganhadores', async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT 
                g.Id as id_ganhador, p.Id as id, g.NomeCompleto, g.NumeroSorte, g.DataSorteio,
                p.Cidade, p.Telefone, p.Instagram, p.TipoPix, p.ChavePix
            FROM Ganhadores g
            INNER JOIN Participantes p ON g.ParticipanteId = p.Id
            ORDER BY g.DataSorteio ASC 
        `);

        res.json({ sucesso: true, ganhadores: resultado.rows });
    } catch (erro) {
        console.error('Erro ao buscar a lista de ganhadores:', erro);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`▶️ Servidor iniciado! Escutando na porta ${PORT}`);
});