from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Project(db.Model):
    __tablename__ = "projects"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    budget = db.Column(db.Float, nullable=True, default=0.0)
    status = db.Column(db.String(50), nullable=False, default="В работе")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description or "",
            "budget": self.budget if self.budget is not None else 0.0,
            "status": self.status,
            "created_at": self.created_at.strftime("%d.%m.%Y") if self.created_at else ""
        }
