# 🎬 Premiere Pro 2026 – ESSYEM Dealer Video Automation

**Automated Dealer Video Editing & Batch Export System**

A reusable automation workflow for Adobe Premiere Pro 2026 that simplifies the creation of personalized promotional videos for multiple dealers using one common video, an ESSYEM PSD template, and a fixed logo ending.

The system is designed to reduce repetitive editing, automatically adjust dealer sequences, and prepare multiple videos for batch export through Adobe Media Encoder.

---

## 📌 Project Overview

This project uses a common main video and a personalized dealer template to generate individual promotional videos for every dealer.

Every dealer has a separate Premiere Pro sequence, but the main video and ending remain common.

The automation is designed to:

- Detect all dealer sequences automatically.
- Adjust nested video content to its actual media duration.
- Trim the ESSYEM PSD dealer template.
- Preserve the existing Dip to Black transition.
- Keep the final 4-second logo ending fixed.
- Prepare all dealer sequences for Adobe Media Encoder.
- Support unlimited future dealer sequences using a naming convention.

## 🗂️ Project Timeline Structure

The Premiere Pro project follows this structure:

| Track | Content |
|---|---|
| V2 | ESSYEM.psd – Dealer Template |
| V1 | PLACE THE VIDEO – Main Nested Video |
| A1 | Main Video Audio |
| Ending | Fixed 4-second logo scene |

### Main Components

**1. ESSYEM.psd – Dealer Template**

The PSD file contains the personalized dealer information and visual elements.

Each dealer sequence uses this template.

**2. PLACE THE VIDEO – Main Video**

The main promotional video is nested and shared across all dealer sequences.

It should remain unchanged during automation.

**3. Dip to Black Transition**

A Dip to Black transition is applied at the end of the ESSYEM PSD template.

The automation must preserve the transition when trimming the template.

**4. Final Logo Ending**

The final 4 seconds are reserved exclusively for the logo ending.

This duration must remain fixed in every exported video.

---

## ⚙️ Automation Workflow

The intended automation follows these steps:

### Step 1 – Detect Dealer Sequences

The system identifies dealer sequences using the following naming convention:

`DEALER - Dealer Name`

Examples:

- DEALER - Palakkad
- DEALER - Thrissur
- DEALER - Kochi
- DEALER - Ernakulam
- DEALER - Coimbatore

All matching sequences should be discovered automatically, including newly created sequences.

### Step 2 – Main Video Duration Adjustment

- Identify the main nested video.
- Determine its actual ending.
- Ensure the video does not extend beyond its intended media duration.
- Use the main video duration as the reference for the dealer sequence.

The shared nested video should not be destructively modified.

### Step 3 – ESSYEM PSD Template Trimming

- Identify the ESSYEM.psd template on V2.
- Calculate the ending of the main video.
- Reserve the final 4 seconds for the logo.
- Trim the PSD template so it ends before the logo section.

### Step 4 – Dip to Black Fade-Out

The existing Dip to Black transition should be retained at the end of the PSD template.

The transition should finish immediately before the final logo scene.

### Step 5 – Fixed Logo Ending

The final 4 seconds must remain unchanged.

No PSD template, dealer information, or other unwanted overlay should extend into this section.

### Step 6 – Batch Export

Prepare all dealer sequences for Adobe Media Encoder.

Each dealer should receive an individual video export.

---

## 🛠️ Requirements

Before using the automation, install the following software:

1. Adobe Premiere Pro 2026.
2. Adobe Media Encoder 2026.
3. Windows 10 or Windows 11.
4. Premiere Pro project file (.prproj).
5. ESSYEM PSD template and all required media assets.
6. The automation script included in this repository.

Make sure Premiere Pro and Media Encoder are installed and working correctly.

---

## 📥 Installation

### Step 1 – Download the Repository

Clone the GitHub repository:

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

Or download the repository as a ZIP file from GitHub.

### Step 2 – Extract the Files

Extract the project into a dedicated folder.

Example:

```text
Dealer-Video-Automation/
│
├── README.md
├── scripts/
│   └── automation-script.jsx
│
├── Premiere_Project/
│   └── DEALERS VIDEO SHAREING.prproj
│
├── Templates/
│   └── ESSYEM.psd
│
└── Exports/
```

Keep your original media files and linked assets accessible to Premiere Pro.

### Step 3 – Open the Premiere Project

1. Launch Adobe Premiere Pro 2026.
2. Open the dealer video project.
3. Check that all media files are online.
4. Confirm that the ESSYEM.psd template is available.
5. Check that the main nested video is working correctly.

---

## ▶️ How to Run the Automation

### Step 1 – Prepare Dealer Sequences

Create or duplicate a dealer sequence.

Use the following naming format:

```text
DEALER - Dealer Name
```

Update the dealer-specific information in the ESSYEM PSD template.

### Step 2 – Check the Timeline

Before running the automation, verify:

- Main video is placed on V1.
- Main audio is placed on A1.
- ESSYEM.psd is placed on V2.
- Dip to Black is applied at the template ending.
- Logo ending is available for the final 4 seconds.

### Step 3 – Run the Script

The automation script should discover all dealer sequences and process them.

The intended execution order is:

1. Scan the Premiere project.
2. Find all dealer sequences.
3. Identify the main video ending.
4. Adjust the dealer sequence duration.
5. Trim the ESSYEM PSD template.
6. Preserve the Dip to Black transition.
7. Protect the final 4-second logo ending.
8. Prepare the dealer sequences for export.

**Note:** The actual script filename and launch method must match the implementation included in the repository. Premiere Pro scripting interfaces have different capabilities, so do not assume that a script can perform every timeline edit or export operation until those functions have been tested.

---

## 🎞️ Export Through Adobe Media Encoder

After processing:

1. Open Adobe Premiere Pro.
2. Check the processed dealer sequences.
3. Send the sequences to Adobe Media Encoder using the supported export workflow.
4. Select the required export preset.
5. Set the output folder.
6. Verify the output filenames.
7. Start the Media Encoder queue.

Example export filenames:

```text
DEALER_PALAKKAD.mp4
DEALER_THRISSUR.mp4
DEALER_KOCHI.mp4
DEALER_ERNAKULAM.mp4
```

Each dealer should receive a separate video file.

---

## ➕ Adding New Dealers in the Future

The system is designed around automatic dealer sequence discovery.

To add a new dealer:

1. Open the Premiere Pro project.
2. Duplicate an existing dealer sequence.
3. Rename the sequence using the required format.
4. Example: `DEALER - KANNUR`.
5. Update the dealer information in the ESSYEM template.
6. Check the main video and logo ending.
7. Run the automation again.
8. Export the newly added dealer sequence.

There should be no need to manually add a new dealer name to a hardcoded list.

**Important:** The automation should process all matching dealer sequences unless an export-only-new-dealers option is implemented.

---

## 📋 Automation Rules

| Feature | Requirement |
|---|---|
| Dealer sequence detection | Automatic |
| Sequence naming | DEALER - Dealer Name |
| Main video | Shared nested sequence |
| Video duration | Based on actual media end |
| Dealer template | ESSYEM.psd |
| Template track | V2 |
| Fade transition | Dip to Black |
| Logo ending | Fixed 4 seconds |
| Export software | Adobe Media Encoder |
| Future dealers | Supported |

---

## ⚠️ Important Notes

- Always create a backup of the original Premiere Pro project.
- Do not overwrite the original project during automation.
- Keep the ESSYEM PSD file and linked media accessible.
- Do not change the shared nested video unnecessarily.
- Verify the Dip to Black transition after trimming.
- Check that the final logo scene is exactly 4 seconds.
- Verify the first and last frames of exported videos.
- Test one dealer sequence before processing the entire project.

---

## 🎯 Project Objective

The main objective is to build a reusable dealer video production system that eliminates repetitive timeline editing.

Instead of manually adjusting every dealer video, the workflow should automatically handle template trimming, fade-out positioning, sequence preparation, and batch exporting.

**One Main Video. One ESSYEM Template. Multiple Dealers. Automated Production.**

---

**Project:** Premiere Pro Dealer Video Automation  
**Template:** ESSYEM.psd  
**Software:** Adobe Premiere Pro 2026  
**Export:** Adobe Media Encoder  
**Ending Duration:** 4 Seconds  
**Platform:** Windows
