import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterOutlet } from "@angular/router";

@Component({
  standalone: true,
  selector: "app-shell",
  imports: [CommonModule, RouterOutlet],
  templateUrl: "./shell.component.html",
  styleUrls: ["./shell.component.scss"]
})
export class ShellComponent implements OnInit {
  ngOnInit(){ console.log("[Shell] init"); }
}
