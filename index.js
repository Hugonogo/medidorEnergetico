const admin = require("firebase-admin");
const serviceAccount = require("/home/hugi/Projects/chaveFirebase/medidor-deenergia-firebase-adminsdk-m0vio-f0a21c5a8d.json");
const express = require('express');
const cors = require('cors');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();   
const app = express();
app.use(express.json());
app.use(cors());

// Exemplo: Adicionar um documento de medições sem o switchState
app.post('/medicoes', async (req, res) => {
    try {
        const { tensao, corrente } = req.body;
        // Estimativa de consumo de energia (simplesmente como exemplo)
        const consumoEstimado = tensao * corrente; // em Watts

        // Adiciona os dados de medição ao Firestore
        await db.collection('medicoesEnergia').add({
            tensao,
            corrente,
            consumoEstimado,
            timestamp: admin.firestore.FieldValue.serverTimestamp() // Para salvar a data e hora da medição
        });

        res.status(200).send("Dados Coletados");
        console.log("Dados armazenados");
    } catch (error) {
        res.status(500).send("Erro na coleta de dados");
        console.log("Erro na coleta de dados", error);
    }
});

// Endpoint para armazenar o estado do switch
app.post('/medicoes/switchstate', async (req, res) => {
    const { switchState } = req.body;

    if (switchState === undefined) {
        return res.status(400).json({ error: "Estado do switch não fornecido" });
    }

    try {
        await db.collection('switchState').doc('currentState').set({
            switchState,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(200).json({ message: "Estado armazenado com sucesso", switchState });
        console.log("Estado do switch armazenado:", switchState);
    } catch (error) {
        res.status(500).json({ error: "Erro ao armazenar o estado", details: error.message });
    }
});

// Recuperar o último documento enviado
app.get('/medicoes/ultimo', async (req, res) => {
    try {
        const snapshot = await db.collection('medicoesEnergia')
            .orderBy('timestamp', 'desc') // Ordenar por timestamp em ordem decrescente
            .limit(1) // Pegar apenas o último documento
            .get();

        if (snapshot.empty) {
            return res.status(404).send("Nenhuma medição encontrada");
        }
      
        const lastDoc = snapshot.docs[0].data();

        if (lastDoc.timestamp){
          const date = new Date(lastDoc.timestamp._seconds * 1000); // Converte segundos para milissegundos
          const offset = -3; // Fuso horário em horas
          const dateLocal = new Date(date.getTime() + offset * 60 * 60 * 1000);
          lastDoc.timestamp = dateLocal.toISOString(); // Converte para formato ISO 8601
        }

        return res.status(200).json(lastDoc); // Retornar o último documento como JSON

    } catch (error) {
        res.status(500).send("Erro ao recuperar os dados");
        console.log("Erro ao recuperar o último documento", error);
    }
});

// Configuração da porta
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
