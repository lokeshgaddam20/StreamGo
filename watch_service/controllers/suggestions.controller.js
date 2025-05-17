import { getSuggestions } from '../elasticsearch/client.js';

const getVideoSuggestions = async (req, res) => {
    try {
        const { q, limit = 5 } = req.query;
        const limitNum = parseInt(limit, 10);
        
        const suggestions = await getSuggestions(q, limitNum);
        res.json({ suggestions });
    } catch (error) {
        console.error('Error in getVideoSuggestions controller:', error);
        res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
};

export default getVideoSuggestions;