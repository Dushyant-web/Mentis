from dataset_loader import build_dataset
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
import joblib

def main():
    print("Loading dataset...")
    X, y = build_dataset()

    print(f"Total samples: {len(X)}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print("Training model...")

    model = RandomForestClassifier(
        n_estimators=150,
        max_depth=10,
        class_weight="balanced",
        random_state=42
    )

    model.fit(X_train, y_train)

    print("Evaluating...")
    y_pred = model.predict(X_test)

    print(classification_report(y_test, y_pred))

    # Save model
    joblib.dump(model, "../ml/dyslexia_model.pkl")

    print("Model saved.")

if __name__ == "__main__":
    main()