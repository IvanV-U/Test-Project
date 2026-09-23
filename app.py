import os
from flask import Flask, render_template, request, jsonify
from models import db, Project

def create_app():
    app = Flask(__name__)
    
    # Конфигурация базы данных SQLite
    os.makedirs(app.instance_path, exist_ok=True)
    db_path = os.path.join(app.instance_path, "projects.db")
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)

    with app.app_context():
        db.create_all()
        seed_initial_data()

    # --- HTML Routes ---
    @app.route("/")
    def index():
        return render_template("index.html")

    # --- REST API Endpoints ---
    @app.route("/api/projects", methods=["GET"])
    def get_projects():
        search_query = request.args.get("q", "").strip()
        status_filter = request.args.get("status", "").strip()

        query = Project.query

        if search_query:
            wildcard = f"%{search_query}%"
            query = query.filter(
                (Project.title.ilike(wildcard)) | (Project.description.ilike(wildcard))
            )

        if status_filter and status_filter != "Все":
            query = query.filter(Project.status == status_filter)

        projects = query.order_by(Project.id.desc()).all()
        return jsonify([p.to_dict() for p in projects]), 200

    @app.route("/api/projects", methods=["POST"])
    def create_project():
        data = request.get_json()
        if not data:
            return jsonify({"error": "Требуется тело запроса в формате JSON"}), 400

        title = str(data.get("title", "")).strip()
        if not title:
            return jsonify({"error": "Название проекта обязательно для заполнения"}), 400

        description = str(data.get("description", "")).strip()
        
        # Обработка сметы/бюджета
        raw_budget = data.get("budget", 0)
        try:
            budget = float(raw_budget) if raw_budget is not None and str(raw_budget).strip() != "" else 0.0
            if budget < 0:
                return jsonify({"error": "Бюджет не может быть отрицательным"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Бюджет должен быть числом"}), 400

        status = str(data.get("status", "В работе")).strip()
        allowed_statuses = ["В работе", "Планирование", "На согласовании", "Завершён"]
        if status not in allowed_statuses:
            status = "В работе"

        new_project = Project(
            title=title,
            description=description,
            budget=budget,
            status=status
        )

        db.session.add(new_project)
        db.session.commit()

        return jsonify(new_project.to_dict()), 201

    @app.route("/api/projects/<int:project_id>", methods=["DELETE"])
    def delete_project(project_id):
        project = db.session.get(Project, project_id)
        if not project:
            return jsonify({"error": "Проект не найден"}), 404

        db.session.delete(project)
        db.session.commit()

        return jsonify({"message": f"Проект '{project.title}' успешно удалён", "id": project_id}), 200

    return app

def seed_initial_data():
    """Добавляет стартовые демонстрационные данные, если база пуста"""
    if Project.query.count() == 0:
        demo_projects = [
            Project(
                title="Автоматизация формирования смет",
                description="Интеграция ИИ для автоматического парсинга спецификаций и расчета сметной стоимости.",
                budget=450000.0,
                status="В работе"
            ),
            Project(
                title="Система классификации проектной документации",
                description="Нейросетевая модель для распознавания типов проектных документов и извлечения реквизитов.",
                budget=280000.0,
                status="Планирование"
            ),
            Project(
                title="Клиентский портал согласования заказов",
                description="Личный кабинет заказчика с возможностью отслеживания этапов и выгрузки актов в PDF.",
                budget=620000.0,
                status="Завершён"
            ),
            Project(
                title="Модуль сверки чертежей и спецификаций",
                description="Компьютерное зрение для проверки соответствия планов этажей проектным ведомостям.",
                budget=390000.0,
                status="На согласовании"
            )
        ]
        db.session.bulk_save_objects(demo_projects)
        db.session.commit()

if __name__ == "__main__":
    app = create_app()
    app.run(host="127.0.0.1", port=5000, debug=True)
