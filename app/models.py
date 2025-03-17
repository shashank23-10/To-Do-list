def task_serializer(task) -> dict:
    return {
        "id": str(task["_id"]),
        "title": task.get("title"),
        "description": task.get("description"),
        "dueDate": task.get("dueDate"),
        "priority": task.get("priority"),
        "status": task.get("status"),
        "completed": task.get("completed"),
        "username": task.get("username"),
        "pinned": task.get("pinned", False),
    }

def chat_message_serializer(chat_message) -> dict:
    return {
        "id": str(chat_message["_id"]),
        "sender": chat_message.get("sender"),
        "receiver": chat_message.get("receiver"),
        "message": chat_message.get("message"),
        "timestamp": chat_message.get("timestamp"),
    }
