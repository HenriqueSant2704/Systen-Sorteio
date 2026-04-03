const express = require('express');
const cors = require('cors');
const { sql, poolPromise } = require('./db');
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

app.get('/', (req, res) => {
    res.send('🚀 API do Sorteio rodando perfeitamente!');
});

function validarNomeCompleto(nome) {
    if (!nome) return false;
    const nomeLimpo = nome.trim();
    const palavras = nomeLimpo.split(/\s+/);
    if (palavras.length < 2 || nomeLimpo.length < 5) return false;
    return true;
}

/* =====================================================================

    ROTA DE CADASTRO (COM VALIDAÇÃO DE DUPLICIDADE)

 ====================================================================*/
app.post('/api/cadastro', async (req, res) => {
    try {
        const { nomeCompleto, cpf, cidade, telefone, email, instagram, tipoPix, chavePix } = req.body;

        if (!validarCPFMatematico(cpf)) {
            return res.status(400).json({ sucesso: false, mensagem: "O CPF fornecido é matematicamente inválido." });
        }
        if (!validarTelefoneReal(telefone)) {
            return res.status(400).json({ sucesso: false, mensagem: "Telefone inválido!" });
        }
        if (!validarNomeCompleto(nomeCompleto)) {
            return res.status(400).json({ sucesso: false, mensagem: "Por favor, informe nome e sobrenome!" });
        }

        const pool = await poolPromise;

        /* ====================================================================
        
                VALIDAÇÃO: Verifica se já existe no banco
        
        =======================================================================*/
        const checkDuplicado = await pool.request()
            .input('CPF', sql.VarChar, cpf)
            .input('Email', sql.VarChar, email)
            .input('Telefone', sql.VarChar, telefone)
            .input('ChavePix', sql.VarChar, chavePix)
            .query(`
                SELECT TOP 1 CPF, Email, Telefone, ChavePix 
                FROM Participantes 
                WHERE CPF = @CPF OR Email = @Email OR Telefone = @Telefone OR ChavePix = @ChavePix
            `);


        if (checkDuplicado.recordset.length > 0) {
            const duplicado = checkDuplicado.recordset[0];
            let msgErro = "Você já está cadastrado no sorteio!";

            if (duplicado.CPF === cpf) msgErro = "Este CPF já está cadastrado no sorteio!";
            else if (duplicado.Email === email) msgErro = "Este E-mail já foi utilizado em outro cadastro!";
            else if (duplicado.Telefone === telefone) msgErro = "Este Telefone já está participando do sorteio!";
            else if (duplicado.ChavePix === chavePix) msgErro = "Esta Chave PIX já está vinculada a outro participante!";

            return res.status(400).json({ sucesso: false, mensagem: msgErro });
        }

        /*===============================================================
        
         SE PASSOU PELA VALIDAÇÃO, GERA O NÚMERO E SALVA

         =============================================================== */


        let numeroSorte;
        let numeroUnico = false;


        while (!numeroUnico) {
            numeroSorte = Math.floor(1000 + Math.random() * 99999);

            const checkSorte = await pool.request()
                .input('NumSorte', sql.Int, numeroSorte)
                .query(`SELECT TOP 1 NumeroSorte FROM Participantes WHERE NumeroSorte = @NumSorte`);

            if (checkSorte.recordset.length === 0) {
                numeroUnico = true;
            }
        }

        await pool.request()
            .input('NomeCompleto', sql.VarChar, nomeCompleto)
            .input('CPF', sql.VarChar, cpf)
            .input('Cidade', sql.VarChar, cidade)
            .input('Telefone', sql.VarChar, telefone)
            .input('Email', sql.VarChar, email)
            .input('Instagram', sql.VarChar, instagram)
            .input('TipoPix', sql.VarChar, tipoPix)
            .input('ChavePix', sql.VarChar, chavePix)
            .input('NumeroSorte', sql.Int, numeroSorte)
            .query(`
                INSERT INTO Participantes 
                (NomeCompleto, CPF, Cidade, Telefone, Email, Instagram, TipoPix, ChavePix, NumeroSorte)
                VALUES 
                (@NomeCompleto, @CPF, @Cidade, @Telefone, @Email, @Instagram, @TipoPix, @ChavePix, @NumeroSorte)
            `);

        res.status(201).json({
            sucesso: true,
            numeroSorte: numeroSorte,
            mensagem: 'Cadastro realizado com sucesso!'
        });

    } catch (erro) {
        console.error('❌ Erro ao salvar cadastro:', erro);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`▶️ Servidor iniciado! Escutando na porta ${PORT}`);
});

/* =====================================================================================

    ROTA DE VALIDAÇÃO (PASSO A PASSO)

 ============================================================================================ */

app.post('/api/validar', async (req, res) => {
    try {
        const { cpf, telefone, email, chavePix } = req.body;


        if (cpf && !validarCPFMatematico(cpf)) {
            return res.json({ duplicado: true, campo: 'cpf', mensagem: 'O CPF fornecido é inválido!' });
        }
        if (telefone && !validarTelefoneReal(telefone)) {
            return res.json({ duplicado: true, campo: 'telefone', mensagem: 'Formato de telefone inválido!' });
        }

        const pool = await poolPromise;

        let query = `SELECT TOP 1 CPF, Telefone, Email, ChavePix FROM Participantes WHERE `;
        let conditions = [];
        const request = pool.request();

        if (cpf) { conditions.push(`CPF = @CPF`); request.input('CPF', sql.VarChar, cpf); }
        if (telefone) { conditions.push(`Telefone = @Telefone`); request.input('Telefone', sql.VarChar, telefone); }
        if (email) { conditions.push(`Email = @Email`); request.input('Email', sql.VarChar, email); }
        if (chavePix) { conditions.push(`ChavePix = @ChavePix`); request.input('ChavePix', sql.VarChar, chavePix); }

        if (conditions.length === 0) return res.json({ duplicado: false });

        query += conditions.join(' OR ');
        const check = await request.query(query);

        if (check.recordset.length > 0) {
            const row = check.recordset[0];
            if (cpf && row.CPF === cpf) return res.json({ duplicado: true, campo: 'cpf', mensagem: 'Este CPF já está cadastrado no sorteio!' });
            if (telefone && row.Telefone === telefone) return res.json({ duplicado: true, campo: 'telefone', mensagem: 'Este Telefone já está participando!' });
            if (email && row.Email === email) return res.json({ duplicado: true, campo: 'email', mensagem: 'Este E-mail já foi utilizado em outro cadastro!' });
            if (chavePix && row.ChavePix === chavePix) return res.json({ duplicado: true, campo: 'chavePix', mensagem: 'Esta Chave PIX já está vinculada!' });
        }

        res.json({ duplicado: false });
    } catch (erro) {
        console.error('Erro na validação:', erro);
        res.status(500).json({ erro: 'Erro no servidor' });
    }
});

/* =====================================================================

   ROTA: GERA CÓDIGO DE WHATSAPP E SALVA NA TABELA TEMPORÁRIA

====================================================================*/


app.post('/api/gerar-codigo', async (req, res) => {
    try {
        const { telefone } = req.body;

        if (!telefone) {
            return res.status(400).json({ sucesso: false, mensagem: "Telefone não informado." });
        }

        const pool = await poolPromise;


        const checkParticipante = await pool.request()
            .input('TelefoneCheck', sql.VarChar, telefone)
            .query(`SELECT TOP 1 Telefone FROM Participantes WHERE Telefone = @TelefoneCheck`);

        if (checkParticipante.recordset.length > 0) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Este WhatsApp já concluiu o cadastro no sorteio!"
            });
        }


        const telefoneLimpo = telefone.replace(/\D/g, '');
        const codigo = Math.floor(1000 + Math.random() * 9000).toString();

        await pool.request()
            .input('Telefone', sql.VarChar, telefoneLimpo)
            .input('Codigo', sql.VarChar, codigo)
            .query(`
                -- 1. Apaga sem dó qualquer código antigo que esse número tenha
                DELETE FROM Verificacoes_WhatsApp WHERE Telefone = @Telefone;
                
                -- 2. Insere o código novo, garantindo que ele será o ÚNICO na tabela
                INSERT INTO Verificacoes_WhatsApp (Telefone, Codigo)
                VALUES (@Telefone, @Codigo);
            `);

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

        if (!telefone || !codigo) {
            return res.status(400).json({ sucesso: false, mensagem: "Dados incompletos." });
        }

        const telefoneLimpo = telefone.replace(/\D/g, '');

        const pool = await poolPromise;
        const busca = await pool.request()
            .input('Telefone', sql.VarChar, telefoneLimpo)
            .input('Codigo', sql.VarChar, codigo)
            .query(`
                SELECT TOP 1 * FROM Verificacoes_WhatsApp 
                WHERE Telefone = @Telefone 
                AND Codigo = @Codigo
                AND DataCriacao >= DATEADD(second, -90, GETDATE())
                ORDER BY DataCriacao DESC
            `);

        if (busca.recordset.length > 0) {
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

        const payload = {
            number: telefone,
            textMessage: {
                text: texto
            }
        };

        const response = await fetch(urlEnvio, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': EVOLUTION_API_KEY
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("Resposta da Evolution:", data);

    } catch (erro) {
        console.error(" Erro na conexão:", erro);
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
            if (msgData.message?.conversation) {
                textoMensagem = msgData.message.conversation;
            } else if (msgData.message?.extendedTextMessage) {
                textoMensagem = msgData.message.extendedTextMessage.text;
            }

            if (textoMensagem.toLowerCase().includes("validar meu número")) {

                const telefoneRealFull = telefoneComSufixo.replace("@s.whatsapp.net", "");

                const telefoneCom55 = telefoneRealFull.startsWith("55") ? telefoneRealFull : "55" + telefoneRealFull;
                const telefoneSem55 = telefoneRealFull.startsWith("55") ? telefoneRealFull.slice(2) : telefoneRealFull;

                const pool = await poolPromise;
                const busca = await pool.request()
                    .input('Tel1', sql.VarChar, telefoneCom55)
                    .input('Tel2', sql.VarChar, telefoneSem55)
                    .query(`
                        SELECT TOP 1 Codigo 
                        FROM Verificacoes_WhatsApp 
                        WHERE (Telefone = @Tel1 OR Telefone = @Tel2)
                        AND DataCriacao >= DATEADD(second, -60, GETDATE()) 
                        ORDER BY DataCriacao DESC
                    `);

                if (busca.recordset.length > 0) {
                    const codigoGerado = busca.recordset[0].Codigo;

                    const respostaZap = `Olá! 🌟 Bem-vindo(a) ao Sorteio Oficial da *Netico*!\n\nO seu código de verificação é: *${codigoGerado}*\n\nVolte à página de cadastro e digite este código para confirmar a sua participação.\n\n---\n🚀 *Aproveitando que você está aqui...*\nJá conhece a melhor internet fibra óptica da região? Navegue com ultravelocidade, jogue sem lag e assista a filmes sem travar!\n\nAcesse nosso site e confira nossos planos: https://netico.com.br/\n\nBoa sorte no sorteio! 🍀\n*Equipe Netico*`;

                    await enviarMensagemEvolution(telefoneRealFull, respostaZap);
                } else {

                   
                    console.log(`Tentativa bloqueada! Número não está no banco: ${telefoneRealFull}`);

                    const msgErroZap = `🚫 *Solicitação Não Encontrada* 🚫\n\nOlá! Recebemos sua mensagem, mas não conseguimos liberar o seu código de acesso ao Sorteio da *Netico*.\n\nIsso geralmente acontece por dois motivos:\n1️⃣ O número digitado lá no formulário é diferente deste WhatsApp.\n2️⃣ O tempo limite de 60 segundos expirou.\n\n🛠️ *Como resolver:*\nPor favor, volte à página de cadastro, recarregue a página e verifique se o seu número de telefone está correto e clique em "Validar".\n\n---\n🌐 Conheça nossos planos de internet ultrarrápida: https://netico.com.br/\n*Equipe Netico*`;

                    await enviarMensagemEvolution(telefoneRealFull, msgErroZap);
                   

                }
            }
        }
    } catch (erro) {
        console.error("Erro no processamento do webhook:", erro);
    }
}); 