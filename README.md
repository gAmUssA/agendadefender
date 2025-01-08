# Agenda Defender

A meeting agenda timer application that helps you keep your meetings on track.

## Installation

1. Install uv (if not already installed):
```bash
pip install uv
```

2. Create and activate virtual environment:
```bash
uv venv
source .venv/bin/activate  # On Unix/macOS
# or
.venv\Scripts\activate  # On Windows
```

3. Install dependencies:
```bash
uv pip install -r requirements.txt
```

## Running the Application

1. Start the server:
```bash
python server.py
```

2. Open your browser and navigate to:
```
http://localhost:8000
```

## Development

The application uses Flask for the development server. The server will automatically reload when you make changes to the Python files.

To install development dependencies:
```bash
uv pip install -r requirements.txt
