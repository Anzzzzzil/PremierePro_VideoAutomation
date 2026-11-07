# Premiere Pro Dealer Video Automation

An automation system for Adobe Premiere Pro 2026 designed to simplify editing and batch exporting personalized dealer promotional videos.

## Key Features

- **Automatic Sequence Detection:** Detects all dealer sequences using the naming convention `DEALER - Dealer Name`.
- **Nested Video Duration Management:** Adjusts video content according to the actual main video duration.
- **PSD Template Trimming:** Automatically trims the dealer-specific PSD template.
- **Dip to Black Transition:** Preserves the fade-out transition at the end of the template.
- **Fixed Logo Ending:** Reserves the final 4 seconds exclusively for the logo ending.
- **Batch Export:** Queues all dealer sequences for export through Adobe Media Encoder.
- **Future Dealer Support:** Automatically detects newly added dealer sequences without manually updating the dealer list.

## Timeline Structure

| Track | Content |
|---|---|
| V2 | Dealer PSD Template (`Templete.psd`) |
| V1 | Main Nested Video (`PLACE THE VIDEO`) |
| A1 | Main Video Audio |
| Ending | Fixed 4-second logo scene |

## Workflow

1. Open the Premiere Pro project.
2. Add or duplicate a dealer sequence.
3. Rename it using `DEALER - Dealer Name`.
4. Update the dealer-specific content.
5. Run the automation script.
6. Automatically adjust the timeline and prepare exports.
7. Export all dealer videos through Adobe Media Encoder.

## Software

- Adobe Premiere Pro 2026
- Adobe Media Encoder
- Premiere Pro scripting/automation tools

## Project Goal

Reduce repetitive editing work and make it easy to generate personalized promotional videos for multiple dealers using one common video template.

**Designed for scalable dealer video production.**
