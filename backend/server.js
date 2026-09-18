const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

app.post('/api/buscar-empresas', async (req, res) => {
    try {
        const { estado, cidade, categoria, termo } = req.body;

        let queryParts = [];
        if (categoria) queryParts.push(categoria);
        if (termo) queryParts.push(termo);
        if (cidade) queryParts.push(cidade);
        if (estado) queryParts.push(estado);
        queryParts.push("Brasil");

        const queryFinal = queryParts.join(", ");

        if (!queryFinal.trim()) {
            return res.status(400).json({ error: 'Informe ao menos um parâmetro para busca.' });
        }

        const response = await axios.post(
            'https://places.googleapis.com/v1/places:searchText',
            { textQuery: queryFinal },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': GOOGLE_API_KEY,
                    'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.rating,places.userRatingCount,places.googleMapsUri,places.primaryTypeDisplayName'
                }
            }
        );

        const places = response.data.places || [];

        // Filtra para manter somente empresas SEM website cadastrado
        const empresasSemSite = places.filter(place => !place.websiteUri);

        const resultadoFormatado = empresasSemSite.map(p => ({
            id: p.id,
            nome: p.displayName?.text || 'Sem nome',
            endereco: p.formattedAddress || 'Endereço não informado',
            telefone: p.nationalPhoneNumber || 'Telefone não cadastrado',
            categoria: p.primaryTypeDisplayName?.text || categoria || 'Negócio Local',
            avaliacoes: p.userRatingCount ? `${p.rating || 0}★ (${p.userRatingCount})` : 'Sem avaliações',
            mapsUrl: p.googleMapsUri || '#'
        }));

        res.json({
            totalEncontradas: places.length,
            empresasSemSite: resultadoFormatado
        });

    } catch (error) {
        console.error('Erro na chamada da API:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Falha ao buscar dados no Google Places.',
            detalhes: error.response?.data?.error?.message || error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});