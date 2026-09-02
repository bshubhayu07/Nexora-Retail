import uvicorn

if __name__ == "__main__":
    print("Starting Qualcomm Edge AI Retail Intelligence Backend Server...")
    print("Interactive Swagger OpenAPI documentation: http://127.0.0.1:8000/docs")
    print("Live WebSocket Endpoint: ws://127.0.0.1:8000/ws/api/v1/dashboard/live")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
