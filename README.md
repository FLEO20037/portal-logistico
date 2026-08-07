# Portal Logístico Multitransportadoras

## Deploy no Render (pronto, via Blueprint)

1. Suba esta pasta para um repositório no GitHub.
2. No Render: **New → Blueprint** → conecte o repositório. Ele lê o
   `render.yaml` da raiz e cria sozinho: banco Postgres, backend (Flask) e
   frontend (site estático), já conectados entre si.
3. Clique em **Apply**. Em poucos minutos:
   - Backend: `https://portal-logistico-backend.onrender.com`
   - Frontend: `https://portal-logistico-frontend.onrender.com`
4. Acesse o frontend e entre com o admin criado automaticamente:
   - **email:** admin@portal.com
   - **senha:** admin123 → **troque essa senha assim que entrar** (editar em Clientes).

Se o Render mudar os nomes dos serviços (nomes já em uso), ajuste as duas
URLs dentro do `render.yaml` (`FRONTEND_URL` e `VITE_API_URL`) para os nomes
reais antes do deploy.

⚠️ No plano free o disco do backend é temporário: PDFs/XMLs enviados somem a
cada novo deploy. Para manter os arquivos entre deploys, adicione um **Disk**
persistente ao serviço backend nas configurações do Render (plano pago).

## Rodar localmente

**Backend**
```
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python app.py
```
`http://localhost:5000` — cria o banco (SQLite) e o admin automaticamente.

**Frontend**
```
cd frontend
npm install
npm run dev
```
`http://localhost:5173`

## Fluxo
Cliente → Notas Fiscais → CT-es (PDF/XML) → Boletos (PDF, status).
JWT; administrador tem CRUD completo, cliente só vê seus próprios dados.
