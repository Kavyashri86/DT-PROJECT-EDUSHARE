# EduShare – Backend API

FastAPI backend for the Student Resource Sharing Platform.

## Setup

### 1. Create a virtual environment
```bash
python -m venv venv
source venv/bin/activate        # Linux/Mac
venv\Scripts\activate           # Windows
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure environment
Edit `.env` with your MySQL credentials:
```
DATABASE_URL=mysql+pymysql://root:password@localhost:3306/edushare
JWT_SECRET=your_super_secret_key_change_this
```

### 4. Create the MySQL database
```sql
CREATE DATABASE edushare;
```

### 5. Run the server
```bash
uvicorn app.main:app --reload
```

### 6. (Optional) Seed sample data
```bash
python seed.py
```

## API Docs
Visit `http://localhost:8000/docs` for the interactive Swagger UI.

## Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /auth/register | No | Register a new student |
| POST | /auth/login | No | Login and get JWT token |
| GET | /resources | No | List all available resources |
| POST | /resources | Yes | Add a new resource |
| PUT | /resources/{id} | Yes | Update your resource |
| DELETE | /resources/{id} | Yes | Delete your resource |
| POST | /requests | Yes | Request a resource |
| GET | /requests | Yes | View your requests |
| PATCH | /requests/{id} | Yes | Approve/reject a request (owner only) |
| POST | /cart | Yes | Add resource to cart |
| GET | /cart | Yes | View your cart |
| DELETE | /cart/{id} | Yes | Remove from cart |
