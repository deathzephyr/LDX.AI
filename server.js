require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve o arquivo HTML

// Variável para armazenar o token de acesso (cache simples)
let cachedToken = null;
let tokenExpiry = null;

// Função para obter o Access Token da Baidu
async function getBaiduAccessToken() {
    // Se já temos um token válido, retorna ele
    if (cachedToken && tokenExpiry && new Date() < tokenExpiry) {
        return cachedToken;
    }

    try {
        const response = await axios.post('https://aip.baidubce.com/oauth/2.0/token', null, {
            params: {
                grant_type: 'client_credentials',
                client_id: process.env.BAIDU_ACCESS_KEY,
                client_secret: process.env.BAIDU_SECRET_KEY
            }
        });

        cachedToken = response.data.access_token;
        // O token expira em 30 dias (segundos), definimos expiração para 29 dias para segurança
        const expiresIn = response.data.expires_in || (29 * 24 * 60 * 60);
        tokenExpiry = new Date(new Date().getTime() + (expiresIn * 1000));
        
        console.log("Novo token de acesso obtido com sucesso.");
        return cachedToken;
    } catch (error) {
        console.error("Erro ao obter token Baidu:", error.response ? error.response.data : error.message);
        throw new Error("Falha na autenticação com a API.");
    }
}

// Rota principal para o chat
app.post('/chat', async (req, res) => {
    const userMessage = req.body.message;

    if (!userMessage) {
        return res.status(400).json({ error: "Mensagem é obrigatória" });
    }

    try {
        const accessToken = await getBaiduAccessToken();
        
        // Endpoint padrão do ERNIE-Bot (Modelo da Baidu)
        // Você pode mudar para 'eb-instant' para um modelo mais rápido/barato
        const apiUrl = `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions?access_token=${accessToken}`;

        const response = await axios.post(apiUrl, {
            messages: [
                { role: 'user', content: userMessage }
            ]
        });

        const botReply = response.data.result;
        res.json({ reply: botReply });

    } catch (error) {
        console.error("Erro na API da IA:", error.response ? error.response.data : error.message);
        res.status(500).json({ reply: "Desculpe, tive um problema ao processar sua solicitação." });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
