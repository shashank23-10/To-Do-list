import { useEffect, useState, useMemo, Fragment } from "react";
import axios from "axios";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import "./Tasks.css";
import kpmglogo from "../images/kpmg-logo.png";
import {
  FaTrash,
  FaThList,
  FaTh,
  FaColumns,
  FaEdit,
  FaCalendar,
  FaThumbtack,
  FaUser,
  FaTabletAlt,
} from "react-icons/fa";

// Helper: decode JWT token to get username (stored under "sub")
function getUsernameFromToken() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub;
  } catch (err) {
    console.error("Failed to decode token", err);
    return null;
  }
}

// CalendarView Component
function CalendarView({ tasks, currentMonth, setCurrentMonth }) {
  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  );
  const lastDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  );
  const startDay = firstDayOfMonth.getDay();

  const days = [];
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
    days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
  }
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const tasksByDate = tasks.reduce((acc, task) => {
    if (task.dueDate) {
      const formattedDate = new Date(task.dueDate)
        .toISOString()
        .slice(0, 10);
      acc[formattedDate] = acc[formattedDate] || [];
      acc[formattedDate].push(task);
    }
    return acc;
  }, {});

  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };
  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <button onClick={prevMonth}>Prev</button>
        <h2>
          {currentMonth.toLocaleString("default", { month: "long" })}{" "}
          {currentMonth.getFullYear()}
        </h2>
        <button onClick={nextMonth}>Next</button>
      </div>
      <div className="calendar-grid">
        <div className="calendar-weekdays">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="calendar-weekday">
              {day}
            </div>
          ))}
        </div>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="calendar-week">
            {week.map((day, index) => (
              <div key={index} className="calendar-day">
                {day ? (
                  <>
                    <div className="calendar-day-number">
                      {day.getDate()}
                    </div>
                    <div className="calendar-day-tasks">
                      {(tasksByDate[day.toISOString().slice(0, 10)] || []).map(
                        (task) => (
                          <div key={task._id} className="calendar-task">
                            {task.title}
                          </div>
                        )
                      )}
                    </div>
                  </>
                ) : (
                  <div className="calendar-day-empty"></div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [pinnedTasks, setPinnedTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("Medium");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [editingTask, setEditingTask] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPriority, setEditPriority] = useState("Medium");

  const [view, setView] = useState("list");
  const [columns, setColumns] = useState({
    todo: { name: "To Do", tasks: [] },
    inprogress: { name: "In Progress", tasks: [] },
    done: { name: "Done", tasks: [] },
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const token = localStorage.getItem("token");
  const currentUser = getUsernameFromToken();
  console.log("Current user:", currentUser);

  useEffect(() => {
    if (!token) {
      alert("You must be logged in!");
      window.location.href = "/login";
      return;
    }
    fetchTasks();
    // eslint-disable-next-line
  }, [token]);

  const fetchTasks = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/tasks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const tasksData = Array.isArray(response.data)
        ? response.data
        : response.data.tasks || [];
      setTasks(tasksData);
      // Update pinned tasks from fetched tasks
      setPinnedTasks(tasksData.filter((task) => task.pinned));
    } catch (error) {
      console.error("Error fetching tasks:", error);
      alert("Failed to fetch tasks");
    }
  };

  const addTask = async () => {
    if (!title || !description) {
      alert("Title and description required!");
      return;
    }
    try {
      const newTask = {
        title,
        description,
        dueDate,
        priority,
        status: "todo",
        completed: false,
        username: currentUser,
      };
      const response = await axios.post("http://127.0.0.1:8000/tasks", newTask, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const createdTask = response.data;
      setTasks((prevTasks) => [...prevTasks, createdTask]);
      setTitle("");
      setDescription("");
      setDueDate("");
      setPriority("Medium");
    } catch (error) {
      console.error("Error adding task:", error);
      alert("Failed to add task");
    }
  };

  // Pin or Unpin a Task
  const togglePinTask = async (task) => {
    if (task.pinned || pinnedTasks.length < 5) {
      try {
        const updatedTask = { ...task, pinned: !task.pinned };
        await axios.put(`http://127.0.0.1:8000/tasks/${task._id}`, updatedTask, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTasks((prevTasks) =>
          prevTasks.map((t) => (t._id === task._id ? updatedTask : t))
        );
        // Update pinned tasks list based on the new pin status
        setPinnedTasks((prev) => {
          if (updatedTask.pinned) return [...prev, updatedTask].slice(0, 5);
          return prev.filter((t) => t._id !== task._id);
        });
      } catch (error) {
        console.error("Error pinning task:", error);
        alert("Failed to pin task");
      }
    } else {
      alert("You can only pin up to 5 tasks.");
    }
  };

  // Update task: Build payload with non-empty fields
  const updateTask = async (taskId) => {
    try {
      const updatedData = {};
      if (editTitle.trim() !== "") updatedData.title = editTitle;
      if (editDescription.trim() !== "") updatedData.description = editDescription;
      if (editDueDate.trim() !== "") updatedData.dueDate = editDueDate;
      if (editPriority.trim() !== "") updatedData.priority = editPriority;

      if (Object.keys(updatedData).length === 0) {
        alert("No fields provided for update");
        return;
      }

      await axios.put(`http://127.0.0.1:8000/tasks/${taskId}`, updatedData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task._id === taskId ? { ...task, ...updatedData } : task
        )
      );
      setEditingTask(null);
    } catch (error) {
      console.error("Error updating task:", error);
      alert("Failed to update task");
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await axios.delete(`http://127.0.0.1:8000/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks((prevTasks) => prevTasks.filter((task) => task._id !== taskId));
      // Remove the task from pinned tasks if needed
      setPinnedTasks((prev) => prev.filter((task) => task._id !== taskId));
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Failed to delete task");
    }
  };

  const toggleComplete = async (task) => {
    try {
      const updatedTask = { ...task, completed: !task.completed };
      updatedTask.status = updatedTask.completed ? "done" : "todo";
      await axios.put(`http://127.0.0.1:8000/tasks/${task._id}`, updatedTask, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      setTasks((prevTasks) =>
        prevTasks.map((t) => (t._id === task._id ? updatedTask : t))
      );
    } catch (error) {
      console.error("Error toggling task completion:", error);
      alert("Failed to update task status");
    }
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reorderedTasks = [...tasks];
    const [movedTask] = reorderedTasks.splice(result.source.index, 1);
    reorderedTasks.splice(result.destination.index, 0, movedTask);
    setTasks(reorderedTasks);
  };

  const onDragEndBoard = (result) => {
    if (!result.destination) return;
    const { source, destination } = result;
    const newColumns = { ...columns };
    const sourceColumn = newColumns[source.droppableId];
    const destColumn = newColumns[destination.droppableId];
    const sourceTasks = Array.from(sourceColumn.tasks);
    const [movedTask] = sourceTasks.splice(source.index, 1);
    if (source.droppableId === destination.droppableId) {
      sourceTasks.splice(destination.index, 0, movedTask);
      newColumns[source.droppableId].tasks = sourceTasks;
    } else {
      const destTasks = Array.from(destColumn.tasks);
      destTasks.splice(destination.index, 0, movedTask);
      newColumns[source.droppableId].tasks = sourceTasks;
      newColumns[destination.droppableId].tasks = destTasks;
      movedTask.status = destination.droppableId;
    }
    setColumns(newColumns);
    const newTasksOrder = [
      ...newColumns.todo.tasks,
      ...newColumns.inprogress.tasks,
      ...newColumns.done.tasks,
    ];
    setTasks(newTasksOrder);
  };

  const displayTasks = useMemo(() => {
    return tasks.filter((task) => {
      const taskUsername = task.username || currentUser;
      if (taskUsername !== currentUser) return false;
      const taskStatus = task.status ? task.status : "todo";
      const searchTerm = searchQuery.toLowerCase();
      const titleMatches =
        task.title && task.title.toLowerCase().includes(searchTerm);
      const descMatches =
        task.description && task.description.toLowerCase().includes(searchTerm);
      return (
        (titleMatches || descMatches) &&
        (filterStatus === "all" || taskStatus === filterStatus)
      );
    });
  }, [tasks, searchQuery, filterStatus, currentUser]);

  useEffect(() => {
    if (view === "board") {
      const boardColumns = { todo: [], inprogress: [], done: [] };
      displayTasks.forEach((task) => {
        const taskStatus = task.status ? task.status : "todo";
        boardColumns[taskStatus].push(task);
      });
      setColumns({
        todo: { name: "To Do", tasks: boardColumns.todo },
        inprogress: { name: "In Progress", tasks: boardColumns.inprogress },
        done: { name: "Done", tasks: boardColumns.done },
      });
    }
  }, [displayTasks, view]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you sure you want to delete your account?")) {
      try {
        await axios.delete("http://127.0.0.1:8000/auth/auth/delete", {
          headers: { Authorization: `Bearer ${token}` },
        });
        localStorage.removeItem("token");
        window.location.href = "/signup";
      } catch (error) {
        alert("Failed to delete account");
      }
    }
  };

function toTitleCase(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

  return (
    <Fragment>
      <header className="header">
        <img className="logo" src={kpmglogo} alt="KPMG Logo" />
        <div className="profile-menu">
          <button
            className="profile-button"
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
          >
            <FaUser /> {toTitleCase(currentUser)}
          </button>
          {showProfileDropdown && (
            <div className="profile-dropdown">
              <button className="dropdown-item" onClick={() => window.location.href = '/conversations'}>
                Conversations
              </button>
              <button className="dropdown-item" onClick={() => window.location.href = '/todoai'}>
                Llama-Ai
              </button>
              <button className="dropdown-item" onClick={handleLogout}>
                Logout
              </button>
              <button className="dropdown-item" onClick={handleDeleteAccount}>
                Delete Account
              </button>
            </div>
          )}
        </div>
      </header>
      <div className="main-content">
        <div className="task-layout">
          <div className="left-panel">
            <div className="add-task-box">
              <h2 className="add-task-title">Add Task</h2>
              <input
                type="text"
                placeholder="Task Title"
                className="tasks-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <input
                type="text"
                placeholder="Task Description"
                className="tasks-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <input
                type="date"
                className="tasks-input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              <select
                className="tasks-input"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="Low">Low Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="High">High Priority</option>
              </select>
              <button className="tasks-button" onClick={addTask}>
                Add Task
              </button>
            </div>
            <div className="pinned-Tasks">
              <h2>Pinned Tasks</h2>
              <ul className="pinned-tasks">
                {pinnedTasks.length === 0 ? (
                  <p>No pinned tasks.</p>
                ) : (
                  pinnedTasks.map((task) => (
                    <li key={task._id} className="pinned-task">
                      <FaThumbtack style={{ marginRight: "5px" }} />
                      {task.title}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
          <div className="right-panel">
            <div className="list-tasks-box">
              <div className="search-filter">
                <input
                  type="text"
                  placeholder="Search Tasks"
                  className="tasks-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <select
                  className="tasks-input"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="todo">To Do</option>
                  <option value="inprogress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="view-toggle">
                <button onClick={() => setView("list")}>
                  <FaThList /> List View
                </button>
                <button onClick={() => setView("gallery")}>
                  <FaTh /> Gallery View
                </button>
                <button onClick={() => setView("board")}>
                  <FaColumns /> Board View
                </button>
                <button onClick={() => setView("calendar")}>
                  <FaCalendar /> Calendar View
                </button>
              </div>
              {view === "list" && (
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="tasks">
                    {(provided) => (
                      <ul
                        className="tasks-list"
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                      >
                        {displayTasks.length === 0 ? (
                          <p className="no-tasks-message">No tasks found.</p>
                        ) : (
                          displayTasks.map((task, index) => (
                            <Draggable
                              key={task._id}
                              draggableId={task._id}
                              index={index}
                            >
                              {(provided) => (
                                <li
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`tasks-item ${
                                    task.completed ? "completed" : ""
                                  }`}
                                >
                                  {editingTask === task._id ? (
                                    <div className="edit-form">
                                      <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) =>
                                          setEditTitle(e.target.value)
                                        }
                                        className="tasks-input"
                                      />
                                      <input
                                        type="text"
                                        value={editDescription}
                                        onChange={(e) =>
                                          setEditDescription(e.target.value)
                                        }
                                        className="tasks-input"
                                      />
                                      <input
                                        type="date"
                                        value={editDueDate}
                                        onChange={(e) =>
                                          setEditDueDate(e.target.value)
                                        }
                                        className="tasks-input"
                                      />
                                      <select
                                        value={editPriority}
                                        onChange={(e) =>
                                          setEditPriority(e.target.value)
                                        }
                                        className="tasks-input"
                                      >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                      </select>
                                      <button
                                        onClick={() => updateTask(task._id)}
                                        className="tasks-button"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => setEditingTask(null)}
                                        className="tasks-button"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="task-display">
                                      <input
                                        type="checkbox"
                                        checked={task.completed || false}
                                        onChange={() => toggleComplete(task)}
                                      />
                                      <span className="tasks-item-title">
                                        {task.title}:
                                      </span>{" "}
                                      {task.description}
                                      {task.dueDate && (
                                        <span className="due-date">
                                          (Due: {task.dueDate})
                                        </span>
                                      )}
                                      {task.priority && (
                                        <span
                                          className="priority"
                                          style={{
                                            background:
                                              task.priority === "Low"
                                                ? "green"
                                                : task.priority === "Medium"
                                                ? "orange"
                                                : "red",
                                          }}
                                        >
                                          {task.priority}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  <div className="task-actions">
                                    {editingTask !== task._id && (
                                      <>
                                        <button
                                          onClick={() => {
                                            setEditingTask(task._id);
                                            setEditTitle(task.title);
                                            setEditDescription(
                                              task.description
                                            );
                                            setEditDueDate(task.dueDate || "");
                                            setEditPriority(
                                              task.priority || "Medium"
                                            );
                                          }}
                                          className="tasks-edit"
                                        >
                                          <FaEdit />
                                        </button>
                                        <button
                                          className="tasks-pin"
                                          onClick={() => togglePinTask(task)}
                                        >
                                          {task.pinned ? (
                                            <FaThumbtack
                                              style={{
                                                color: "blue",
                                                marginRight: "5px",
                                              }}
                                            />
                                          ) : (
                                            <FaThumbtack
                                              style={{
                                                color: "gray",
                                                marginRight: "5px",
                                              }}
                                            />
                                          )}
                                        </button>
                                      </>
                                    )}
                                    <button
                                      className="tasks-delete"
                                      onClick={() => deleteTask(task._id)}
                                    >
                                      <FaTrash />
                                    </button>
                                  </div>
                                </li>
                              )}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}
                      </ul>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
              {view === "gallery" && (
                <div className="tasks-gallery">
                  {displayTasks.length === 0 ? (
                    <p className="no-tasks-message">No tasks found.</p>
                  ) : (
                    displayTasks.map((task) => (
                      <div
                        key={task._id}
                        className={`task-card ${
                          task.completed ? "completed" : ""
                        }`}
                      >
                        {editingTask === task._id ? (
                          <div className="edit-form">
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="tasks-input"
                            />
                            <input
                              type="text"
                              value={editDescription}
                              onChange={(e) =>
                                setEditDescription(e.target.value)
                              }
                              className="tasks-input"
                            />
                            <input
                              type="date"
                              value={editDueDate}
                              onChange={(e) => setEditDueDate(e.target.value)}
                              className="tasks-input"
                            />
                            <select
                              value={editPriority}
                              onChange={(e) => setEditPriority(e.target.value)}
                              className="tasks-input"
                            >
                              <option value="Low">Low</option>
                              <option value="Medium">Medium</option>
                              <option value="High">High</option>
                            </select>
                            <button
                              onClick={() => updateTask(task._id)}
                              className="tasks-button"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingTask(null)}
                              className="tasks-button"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="task-display">
                              <input
                                type="checkbox"
                                checked={task.completed || false}
                                onChange={() => toggleComplete(task)}
                              />
                              <h3>{task.title}</h3>
                              <p>{task.description}</p>
                              {task.dueDate && (
                                <p className="due-date">
                                  Due: {task.dueDate}
                                </p>
                              )}
                              {task.priority && (
                                <p
                                  className="priority"
                                  style={{
                                    background:
                                      task.priority === "Low"
                                        ? "green"
                                        : task.priority === "Medium"
                                        ? "orange"
                                        : "red",
                                  }}
                                >
                                  {task.priority}
                                </p>
                              )}
                            </div>
                            <div className="task-actions">
                              <button
                                onClick={() => {
                                  setEditingTask(task._id);
                                  setEditTitle(task.title);
                                  setEditDescription(task.description);
                                  setEditDueDate(task.dueDate || "");
                                  setEditPriority(task.priority || "Medium");
                                }}
                                className="tasks-edit"
                              >
                                <FaEdit />
                              </button>
                              <button
                                className="tasks-pin"
                                onClick={() => togglePinTask(task)}
                              >
                                {task.pinned ? (
                                  <FaThumbtack
                                    style={{
                                      color: "blue",
                                      marginRight: "5px",
                                    }}
                                  />
                                ) : (
                                  <FaThumbtack
                                    style={{
                                      color: "gray",
                                      marginRight: "5px",
                                    }}
                                  />
                                )}
                              </button>
                              <button
                                className="tasks-delete"
                                onClick={() => deleteTask(task._id)}
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
              {view === "board" && (
                <div className="board-container">
                  <DragDropContext onDragEnd={onDragEndBoard}>
                    {Object.entries(columns).map(([columnId, column]) => (
                      <div key={columnId} className="board-column">
                        <h2 className="board-column-title">{column.name}</h2>
                        <Droppable droppableId={columnId}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className="board-droppable"
                            >
                              {column.tasks.map((task, index) => (
                                <Draggable
                                  key={task._id}
                                  draggableId={task._id}
                                  index={index}
                                >
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`board-task-card ${
                                        task.completed ? "completed" : ""
                                      }`}
                                    >
                                      {editingTask === task._id ? (
                                        <div className="edit-form">
                                          <input
                                            type="text"
                                            value={editTitle}
                                            onChange={(e) =>
                                              setEditTitle(e.target.value)
                                            }
                                            className="tasks-input"
                                          />
                                          <input
                                            type="text"
                                            value={editDescription}
                                            onChange={(e) =>
                                              setEditDescription(e.target.value)
                                            }
                                            className="tasks-input"
                                          />
                                          <input
                                            type="date"
                                            value={editDueDate}
                                            onChange={(e) =>
                                              setEditDueDate(e.target.value)
                                            }
                                            className="tasks-input"
                                          />
                                          <select
                                            value={editPriority}
                                            onChange={(e) =>
                                              setEditPriority(e.target.value)
                                            }
                                            className="tasks-input"
                                          >
                                            <option value="Low">Low</option>
                                            <option value="Medium">Medium</option>
                                            <option value="High">High</option>
                                          </select>
                                          <button
                                            onClick={() => updateTask(task._id)}
                                            className="tasks-button"
                                          >
                                            Save
                                          </button>
                                          <button
                                            onClick={() =>
                                              setEditingTask(null)
                                            }
                                            className="tasks-button"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="task-display">
                                          <input
                                            type="checkbox"
                                            checked={task.completed || false}
                                            onChange={() =>
                                              toggleComplete(task)
                                            }
                                          />
                                          <h3>{task.title}</h3>
                                          <p>{task.description}</p>
                                          {task.dueDate && (
                                            <p className="due-date">
                                              Due: {task.dueDate}
                                            </p>
                                          )}
                                          {task.priority && (
                                            <p
                                              className="priority"
                                              style={{
                                                background:
                                                  task.priority === "Low"
                                                    ? "green"
                                                    : task.priority === "Medium"
                                                    ? "orange"
                                                    : "red",
                                              }}
                                            >
                                              {task.priority}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                      <div className="task-actions">
                                        {editingTask !== task._id && (
                                          <>
                                            <button
                                              onClick={() => {
                                                setEditingTask(task._id);
                                                setEditTitle(task.title);
                                                setEditDescription(
                                                  task.description
                                                );
                                                setEditDueDate(
                                                  task.dueDate || ""
                                                );
                                                setEditPriority(
                                                  task.priority || "Medium"
                                                );
                                              }}
                                              className="tasks-edit"
                                            >
                                              <FaEdit />
                                            </button>
                                            <button
                                              className="tasks-pin"
                                              onClick={() =>
                                                togglePinTask(task)
                                              }
                                            >
                                              {task.pinned ? (
                                                <FaThumbtack
                                                  style={{
                                                    color: "blue",
                                                    marginRight: "5px",
                                                  }}
                                                />
                                              ) : (
                                                <FaThumbtack
                                                  style={{
                                                    color: "gray",
                                                    marginRight: "5px",
                                                  }}
                                                />
                                              )}
                                            </button>
                                          </>
                                        )}
                                        <button
                                          className="tasks-delete"
                                          onClick={() => deleteTask(task._id)}
                                        >
                                          <FaTrash />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    ))}
                  </DragDropContext>
                </div>
              )}
              {view === "calendar" && (
                <CalendarView
                  tasks={displayTasks}
                  currentMonth={currentMonth}
                  setCurrentMonth={setCurrentMonth}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}


export default Tasks;
