import argparse
import os
 
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms
 
CLASSES = ["empty", "low", "stocked"]  # fixed order - index must match this everywhere
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
 
 
def build_model():
    # MobileNetV2 - small, fast, easy for Adarsh to quantize/optimize later
    model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)
    # Replace the final classifier layer for our 3 classes
    model.classifier[1] = nn.Linear(model.last_channel, len(CLASSES))
    return model.to(DEVICE)
 
 
def get_dataloaders(data_dir, batch_size=8):
    train_tf = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    val_tf = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
 
    train_ds = datasets.ImageFolder(os.path.join(data_dir, "train"), transform=train_tf)
    val_ds = datasets.ImageFolder(os.path.join(data_dir, "val"), transform=val_tf)
 
    # Sanity check: folder-derived class order must match our fixed CLASSES list
    assert train_ds.classes == CLASSES, (
        f"Found classes {train_ds.classes}, expected {CLASSES}. "
        f"Rename your data/train/* folders to match exactly."
    )
 
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)
    return train_loader, val_loader
 
 
def train(data_dir, epochs, batch_size, out_path):
    model = build_model()
    train_loader, val_loader = get_dataloaders(data_dir, batch_size)
 
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-4)
 
    for epoch in range(epochs):
        model.train()
        running_loss = 0.0
        for imgs, labels in train_loader:
            imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
            optimizer.zero_grad()
            outputs = model(imgs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            running_loss += loss.item()
 
        # Quick validation accuracy each epoch
        model.eval()
        correct, total = 0, 0
        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
                outputs = model(imgs)
                preds = outputs.argmax(dim=1)
                correct += (preds == labels).sum().item()
                total += labels.size(0)
        val_acc = correct / total if total else 0.0
 
        print(f"[Epoch {epoch+1}/{epochs}] loss={running_loss/len(train_loader):.4f} "
              f"val_acc={val_acc:.2%}")
 
    torch.save(model.state_dict(), out_path)
    print(f"\n[INFO] Model saved to {out_path}")
 
 
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", default="data", help="Root folder with train/ and val/")
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--out", default="shelf_classifier.pt")
    args = parser.parse_args()
    train(args.data_dir, args.epochs, args.batch_size, args.out)
 
