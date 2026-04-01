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

        /*===============================================================

            GERA O NÚMERO EXCLUSIVO E SALVA

         =============================================================== */

        let numeroSorte;
        let numeroUnico = false;

        
        while (!numeroUnico) {
            numeroSorte = Math.floor(1000 + Math.random() * 90000);
            
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