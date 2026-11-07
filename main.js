"use strict";

const ppro = require("premierepro");
const $ = (id) => document.getElementById(id);
let cached = [];
let scannedProjectGuid = null;

function status(message) {
  $("status").textContent = message;
}

function normalizeClipName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\[(v|a)\]/g, "")
    .replace(/\.(mov|mp4|mxf|wav|mp3|aif|aiff)$/i, "")
    .replace(/[^a-z0-9]/g, "");
}

async function readAudioItems(sequence) {
  const count = await sequence.getAudioTrackCount();
  const items = [];
  for (let trackIndex = 0; trackIndex < count; trackIndex += 1) {
    const track = await sequence.getAudioTrack(trackIndex);
    const clips = track.getTrackItems(ppro.Constants.TrackItemType.CLIP, false);
    for (let clipIndex = 0; clipIndex < clips.length; clipIndex += 1) {
      const clip = clips[clipIndex];
      const name = await clip.getName();
      const start = await clip.getStartTime();
      const end = await clip.getEndTime();
      const projectItem = await clip.getProjectItem();
      const projectName = projectItem ? projectItem.name : "";
      const sourceIn = await clip.getInPoint();
      const sourceOut = await clip.getOutPoint();
      const timelineSpan = end.seconds - start.seconds;
      const sourceSpan = sourceOut.seconds - sourceIn.seconds;
      const speedFactor = timelineSpan > 0 && sourceSpan > 0 ? sourceSpan / timelineSpan : 0;
      let sourceLimitOutSeconds = null;
      if (projectItem && speedFactor > 0) {
        try {
          const clipItem = ppro.ClipProjectItem.cast(projectItem);
          if (await clipItem.isSequence()) {
            const nested = await clipItem.getSequence();
            const audioTrackCount = await nested.getAudioTrackCount();
            let latestAudioEnd = 0;
            for (let nestedTrackIndex = 0; nestedTrackIndex < audioTrackCount; nestedTrackIndex += 1) {
              const nestedTrack = await nested.getAudioTrack(nestedTrackIndex);
              const nestedClips = nestedTrack.getTrackItems(ppro.Constants.TrackItemType.CLIP, false);
              for (const nestedClip of nestedClips) {
                const nestedEnd = await nestedClip.getEndTime();
                latestAudioEnd = Math.max(latestAudioEnd, nestedEnd.seconds);
              }
            }
            const nestedEnd = await nested.getEndTime();
            sourceLimitOutSeconds = latestAudioEnd > 0 ? Math.min(latestAudioEnd, nestedEnd.seconds) : nestedEnd.seconds;
          } else {
            const mediaOut = await clipItem.getOutPoint(ppro.Constants.MediaType.AUDIO);
            if (mediaOut && mediaOut.seconds > sourceIn.seconds) sourceLimitOutSeconds = mediaOut.seconds;
          }
        } catch (_) {
          // If Premiere cannot expose the source audio limit, keep the current clip boundary.
        }
      }
      const sourceLimitEndSeconds = sourceLimitOutSeconds !== null &&
        sourceLimitOutSeconds > sourceIn.seconds && speedFactor > 0
        ? start.seconds + (sourceLimitOutSeconds - sourceIn.seconds) / speedFactor
        : end.seconds;
      items.push({
        clip, clipIndex, trackIndex, trackName: track.name || ("A" + (trackIndex + 1)),
        name: name || projectName || "Audio clip", projectName,
        startSeconds: start.seconds, endSeconds: end.seconds,
        sourceLimitEndSeconds
      });
    }
  }
  return items;
}

async function describeSequence(sequence) {
  const videoCount = await sequence.getVideoTrackCount();
  const clips = [];
  const transitionItems = [];
  const audioItems = await readAudioItems(sequence);
  for (let index = 0; index < videoCount; index += 1) {
    const track = await sequence.getVideoTrack(index);
    const trackName = track.name || ("V" + (index + 1));
    const trackClips = track.getTrackItems(ppro.Constants.TrackItemType.CLIP, false);
    const trackTransitions = track.getTrackItems(ppro.Constants.TrackItemType.TRANSITION, false);
    for (let clipIndex = 0; clipIndex < trackClips.length; clipIndex += 1) {
      const clip = trackClips[clipIndex];
      const clipName = await clip.getName();
      const start = await clip.getStartTime();
      const end = await clip.getEndTime();
      const projectItem = await clip.getProjectItem();
      const projectName = projectItem ? projectItem.name : "";
      const displayName = clipName || projectName || "";
      let nestedLimitEndSeconds = null;
      if (projectItem && /PLACE\s+THE\s+VIDEO/i.test(displayName + " " + projectName)) {
        try {
          const clipProjectItem = ppro.ClipProjectItem.cast(projectItem);
          if (await clipProjectItem.isSequence()) {
            const nestedSequence = await clipProjectItem.getSequence();
            const nestedEnd = await nestedSequence.getEndTime();
            const sourceIn = await clip.getInPoint();
            const sourceOut = await clip.getOutPoint();
            const sourceSpan = sourceOut.seconds - sourceIn.seconds;
            const timelineSpan = end.seconds - start.seconds;
            const speedFactor = timelineSpan > 0 ? sourceSpan / timelineSpan : 0;
            if (sourceSpan > 0 && speedFactor > 0) {
              const availableSource = nestedEnd.seconds - sourceIn.seconds;
              nestedLimitEndSeconds = start.seconds + availableSource / speedFactor;
            }
          }
        } catch (_) {
          // Fall back to the nested clip's current timeline end when source-sequence access is unavailable.
        }
      }
      clips.push({
        clip, clipIndex, name: displayName, projectName, trackIndex: index, trackName,
        startSeconds: start.seconds, endSeconds: end.seconds,
        nestedLimitEndSeconds,
        isPsd: /\.psd$/i.test(displayName) || /\.psd$/i.test(projectName)
      });
    }
    for (const transition of trackTransitions) {
      try {
        const end = await transition.getEndTime();
        const name = await transition.getName();
        const matchName = await transition.getMatchName();
        transitionItems.push({
          name: name || matchName || "Video transition",
          matchName: matchName || "",
          trackIndex: index,
          endSeconds: end.seconds
        });
      } catch (_) {
        // Some host builds expose transition items without clip-style accessors.
      }
    }
  }

  const psdClips = clips.filter((item) => item.isPsd);
  const nonPsdClips = clips.filter((item) => !item.isPsd);
  const namedMain = nonPsdClips
    .filter((item) => /PLACE\s+THE\s+VIDEO/i.test(item.name))
    .sort((a, b) => b.endSeconds - a.endSeconds)[0];
  const mainVideo = namedMain
    ? {
        name: namedMain.name,
        projectName: namedMain.projectName,
        trackIndex: namedMain.trackIndex,
        clipIndex: namedMain.clipIndex,
        startSeconds: namedMain.startSeconds,
        currentEndSeconds: namedMain.endSeconds,
        targetEndSeconds: namedMain.nestedLimitEndSeconds || namedMain.endSeconds,
        hasNestedLimit: namedMain.nestedLimitEndSeconds !== null
      }
    : null;
  const alignedAudio = mainVideo
    ? audioItems.filter((item) => Math.abs(item.startSeconds - mainVideo.startSeconds) <= 0.05)
    : [];
  const videoNameKeys = mainVideo
    ? [normalizeClipName(mainVideo.name), normalizeClipName(mainVideo.projectName)].filter(Boolean)
    : [];
  const sameSourceAudio = alignedAudio.filter((item) =>
    [normalizeClipName(item.name), normalizeClipName(item.projectName)]
      .some((key) => videoNameKeys.includes(key))
  );
  const matchedAudio = sameSourceAudio.length ? sameSourceAudio : alignedAudio;
  const commonMediaEndSeconds = mainVideo && matchedAudio.length
    ? Math.min(mainVideo.targetEndSeconds, ...matchedAudio.map((item) => item.sourceLimitEndSeconds))
    : mainVideo ? mainVideo.targetEndSeconds : null;
  if (mainVideo && commonMediaEndSeconds !== null) {
    mainVideo.targetEndSeconds = commonMediaEndSeconds;
    mainVideo.audioMatched = matchedAudio.length > 0;
    mainVideo.audioItems = matchedAudio.map((item) => ({
      trackIndex: item.trackIndex,
      clipIndex: item.clipIndex,
      trackName: item.trackName,
      name: item.name,
      currentEndSeconds: item.endSeconds,
      targetEndSeconds: Math.min(commonMediaEndSeconds, item.sourceLimitEndSeconds)
    }));
  }
  const videoEndSeconds = mainVideo
    ? commonMediaEndSeconds
    : nonPsdClips.reduce((latest, item) => Math.max(latest, item.endSeconds), 0);

  // Prefer a PSD on V2, then the earliest-starting/longest PSD template.
  psdClips.sort((a, b) => {
    const aV2 = a.trackIndex === 1 || /^V2$/i.test(a.trackName);
    const bV2 = b.trackIndex === 1 || /^V2$/i.test(b.trackName);
    if (aV2 !== bV2) return aV2 ? -1 : 1;
    if (a.startSeconds !== b.startSeconds) return a.startSeconds - b.startSeconds;
    return (b.endSeconds - b.startSeconds) - (a.endSeconds - a.startSeconds);
  });
  const template = psdClips[0] || null;
  if (template) {
    template.endTransition = transitionItems.find((item) =>
      item.trackIndex === template.trackIndex &&
      Math.abs(item.endSeconds - template.endSeconds) <= 0.05
    ) || null;
  }
  return {
    sequence, videoEndSeconds, mainVideo, template, psdCount: psdClips.length,
    otherPsdNames: psdClips.slice(1).map((item) => item.name)
  };
}

async function discoverPsdSequences(project) {
  const allSequences = await project.getSequences();
  const rows = [];
  for (let sequenceIndex = 0; sequenceIndex < allSequences.length; sequenceIndex += 1) {
    const sequence = allSequences[sequenceIndex];
    const row = await describeSequence(sequence);
    if (row.template) {
      row.sequenceIndex = sequenceIndex;
      rows.push(row);
    }
  }
  return { allSequences, rows };
}

async function scan() {
  try {
    const project = await ppro.Project.getActiveProject();
    if (!project) throw new Error("No active Premiere project. Open the project first.");
    const discovered = await discoverPsdSequences(project);
    cached = discovered.rows;
    scannedProjectGuid = project.guid ? String(project.guid) : project.path;
    $("apply").disabled = cached.length === 0;
    $("queue").disabled = cached.length === 0;
    const logoSeconds = Number($("logoSeconds").value) || 4;
    const lines = [
      "Scanned " + discovered.allSequences.length + " sequence(s).",
      "Found PSD template clips in " + cached.length + " sequence(s).",
      "Trim target: shared audio/video source end minus " + logoSeconds + " seconds.",
      ""
    ];
    for (const row of cached) {
      const target = row.videoEndSeconds - logoSeconds;
      const detail = row.videoEndSeconds > 0
        ? "PSD: " + row.template.name + " on " + row.template.trackName +
          "; shared audio/video end " + row.videoEndSeconds.toFixed(3) +
          "s; PSD target " + target.toFixed(3) + "s"
        : "PSD: " + row.template.name + "; no non-PSD video clip found";
      lines.push(row.sequence.name + " — " + detail);
      if (row.mainVideo && row.mainVideo.hasNestedLimit &&
          Math.abs(row.mainVideo.targetEndSeconds - row.mainVideo.currentEndSeconds) <= 0.01) {
        lines.push("  PLACE THE VIDEO already reaches its nested source limit.");
      } else if (row.mainVideo && !row.mainVideo.hasNestedLimit) {
        lines.push("  Nested source limit could not be read; PLACE THE VIDEO will not be extended automatically.");
      }
      if (row.mainVideo && row.mainVideo.hasNestedLimit &&
          Math.abs(row.mainVideo.targetEndSeconds - row.mainVideo.currentEndSeconds) > 0.01) {
        const adjustment = row.mainVideo.targetEndSeconds > row.mainVideo.currentEndSeconds ? "extend" : "trim";
        lines.push("  PLACE THE VIDEO currently ends at " +
          row.mainVideo.currentEndSeconds.toFixed(3) + "s; will " + adjustment + " to shared source-supported end " +
          row.mainVideo.targetEndSeconds.toFixed(3) + "s.");
      }
      if (row.mainVideo && row.mainVideo.audioItems && row.mainVideo.audioItems.length) {
        for (const audioInfo of row.mainVideo.audioItems) {
          lines.push("  Audio " + audioInfo.name + " on " + audioInfo.trackName +
            " currently ends at " + audioInfo.currentEndSeconds.toFixed(3) + "s; target " +
            audioInfo.targetEndSeconds.toFixed(3) + "s.");
        }
      } else if (row.mainVideo) {
        lines.push("  No audio clip aligned with PLACE THE VIDEO was found; no audio edit is planned.");
      }
      if (row.psdCount > 1) {
        lines.push("  " + (row.psdCount - 1) + " other PSD clip(s); selecting the V2/earliest-starting template.");
      }
    }
    if (cached.length === 0) {
      lines.push("No PSD clips found. Confirm the intended project is active and PSDs are placed in sequences.");
    }
    lines.push("", "Cross Dissolve is applied to the end of the PSD clip only. Duration: " +
      (Number($("transitionFrames").value) || 43) + " frames.");
    status(lines.join("\n"));
  } catch (error) {
    status("Scan failed: " + (error.message || error));
  }
}

async function trimTemplatesAndAddFade() {
  const logoSeconds = Number($("logoSeconds").value);
  const transitionFrames = Math.floor(Number($("transitionFrames").value));
  if (!Number.isFinite(logoSeconds) || logoSeconds <= 0) {
    status("Enter a logo duration greater than zero.");
    return;
  }
  if (!Number.isFinite(transitionFrames) || transitionFrames <= 0) {
    status("Enter a transition duration of at least one frame.");
    return;
  }
  if (cached.length === 0) {
    status("Scan the project first. No PSD sequences are listed.");
    return;
  }
  try {
    const project = await ppro.Project.getActiveProject();
    const currentGuid = project.guid ? String(project.guid) : project.path;
    if (scannedProjectGuid && currentGuid !== scannedProjectGuid) {
      throw new Error("The active project changed after scanning. Scan again before editing.");
    }
    // Premiere invalidates some timeline script objects between panel button callbacks.
    // Rebuild the scan here and use fresh sequence/track/clip handles for every transaction.
    const discovered = await discoverPsdSequences(project);
    cached = discovered.rows;
    let updated = 0;
    const skipped = [];
    const fadeFailed = [];
    for (const row of cached) {
      const psd = row.template;
      if (!psd || row.videoEndSeconds <= 0) {
        skipped.push(row.sequence.name + ": no non-PSD video end reference");
        continue;
      }
      const targetSeconds = row.videoEndSeconds - logoSeconds;
      if (targetSeconds <= psd.startSeconds) {
        skipped.push(row.sequence.name + ": cut point is before the PSD starts");
        continue;
      }
      const liveSequences = await project.getSequences();
      const sequence = liveSequences[row.sequenceIndex];
      if (!sequence) {
        skipped.push(row.sequence.name + ": sequence handle could not be refreshed");
        continue;
      }
      const settings = await sequence.getSettings();
      const frameRateValue = settings.getVideoFrameRate().value;
      const psdTrack = await sequence.getVideoTrack(psd.trackIndex);
      const mainTrack = row.mainVideo
        ? await sequence.getVideoTrack(row.mainVideo.trackIndex)
        : null;
      const audioTrackRows = [];
      if (row.mainVideo && row.mainVideo.audioItems) {
        for (const audioInfo of row.mainVideo.audioItems) {
          audioTrackRows.push({
            info: audioInfo,
            track: await sequence.getAudioTrack(audioInfo.trackIndex)
          });
        }
      }
      let transactionResult = false;
      let foundLiveClip = false;
      let foundLiveMain = false;
      let foundLiveAudioCount = 0;
      project.lockedAccess(() => {
        const frameRate = ppro.FrameRate.createWithValue(frameRateValue);
        const target = ppro.TickTime.createWithSeconds(targetSeconds).alignToFrame(frameRate);
        const mainTarget = row.mainVideo && row.mainVideo.hasNestedLimit
          ? ppro.TickTime.createWithSeconds(row.mainVideo.targetEndSeconds).alignToFrame(frameRate)
          : null;
        const livePsdClips = psdTrack.getTrackItems(ppro.Constants.TrackItemType.CLIP, false);
        const livePsd = livePsdClips[psd.clipIndex];
        if (!livePsd) return;
        const liveMainClips = mainTrack
          ? mainTrack.getTrackItems(ppro.Constants.TrackItemType.CLIP, false)
          : [];
        const liveMain = row.mainVideo ? liveMainClips[row.mainVideo.clipIndex] : null;
        foundLiveMain = Boolean(liveMain);
        const liveAudios = audioTrackRows.map((item) => ({
          info: item.info,
          clip: item.track.getTrackItems(ppro.Constants.TrackItemType.CLIP, false)[item.info.clipIndex]
        }));
        foundLiveAudioCount = liveAudios.filter((item) => Boolean(item.clip)).length;
        foundLiveClip = true;
        transactionResult = project.executeTransaction((compoundAction) => {
          if (liveMain && mainTarget &&
              Math.abs(row.mainVideo.currentEndSeconds - mainTarget.seconds) > 0.5 / frameRateValue) {
            compoundAction.addAction(liveMain.createSetEndAction(mainTarget));
          }
          for (const audioItem of liveAudios) {
            if (audioItem.clip &&
                Math.abs(audioItem.info.currentEndSeconds - audioItem.info.targetEndSeconds) > 0.5 / frameRateValue) {
              const audioTarget = ppro.TickTime.createWithSeconds(audioItem.info.targetEndSeconds).alignToFrame(frameRate);
              compoundAction.addAction(audioItem.clip.createSetEndAction(audioTarget));
            }
          }
          if (Math.abs(psd.endSeconds - target.seconds) > 0.5 / frameRateValue) {
            compoundAction.addAction(livePsd.createSetEndAction(target));
          }
        }, "Align audio and video; trim PSD — " + sequence.name);
      });
      if (!foundLiveClip) {
        skipped.push(row.sequence.name + ": PSD timeline item could not be refreshed");
        continue;
      }
      if (row.mainVideo && row.mainVideo.hasNestedLimit && !foundLiveMain) {
        skipped.push(row.sequence.name + ": PLACE THE VIDEO could not be refreshed, so its nested duration was not changed");
      }
      if (row.mainVideo && row.mainVideo.audioItems &&
          foundLiveAudioCount < row.mainVideo.audioItems.length) {
        skipped.push(row.sequence.name + ": one or more matching audio clips could not be refreshed");
      }
      const ok = transactionResult;
      if (ok) updated += 1;
      else skipped.push(row.sequence.name + ": Premiere declined the edit transaction");
    }

    // Apply the fade only after all clip boundary edits have committed. Premiere can
    // retain stale transition-boundary data when a trim and transition are added together.
    const matchNames = await ppro.TransitionFactory.getVideoTransitionMatchNames();
    const crossDissolveMatchName = matchNames.find((name) =>
      String(name).toLowerCase().replace(/[^a-z]/g, "").includes("crossdissolve")
    );
    if (!crossDissolveMatchName) {
      fadeFailed.push("Premiere did not report a Cross Dissolve transition.");
    } else {
      const refreshed = await discoverPsdSequences(project);
      for (const row of refreshed.rows) {
        const liveSequences = await project.getSequences();
        const sequence = liveSequences[row.sequenceIndex];
        if (!sequence || !row.template) {
          fadeFailed.push(row.sequence.name + ": PSD could not be refreshed for fade");
          continue;
        }
        const settings = await sequence.getSettings();
        const frameRate = ppro.FrameRate.createWithValue(settings.getVideoFrameRate().value);
        const duration = ppro.TickTime.createWithFrameAndFrameRate(transitionFrames, frameRate);
        const track = await sequence.getVideoTrack(row.template.trackIndex);
        let fadeTransaction = false;
        let foundPsd = false;
        project.lockedAccess(() => {
          const clips = track.getTrackItems(ppro.Constants.TrackItemType.CLIP, false);
          const livePsd = clips[row.template.clipIndex];
          if (!livePsd) return;
          foundPsd = true;
          const options = new ppro.AddTransitionOptions();
          options.setApplyToStart(false);
          options.setForceSingleSided(true);
          options.setDuration(duration);
          const crossDissolve = ppro.TransitionFactory.createVideoTransition(crossDissolveMatchName);
          fadeTransaction = project.executeTransaction((compoundAction) => {
            if (row.template.endTransition) {
              compoundAction.addAction(
                livePsd.createRemoveVideoTransitionAction(ppro.Constants.TransitionPosition.END)
              );
            }
            compoundAction.addAction(livePsd.createAddVideoTransitionAction(crossDissolve, options));
          }, "Apply Cross Dissolve to PSD — " + sequence.name);
        });
        if (!foundPsd) fadeFailed.push(row.sequence.name + ": PSD timeline item could not be refreshed");
        else if (!fadeTransaction) fadeFailed.push(row.sequence.name + ": Premiere declined the PSD transition transaction");
      }
    }
    await project.save();
    const postEdit = await discoverPsdSequences(project);
    const fadeVerified = postEdit.rows.filter((row) => {
      const transition = row.template && row.template.endTransition;
      const name = transition && (transition.matchName || transition.name || "");
      return /cross\s*dissolve/i.test(name) || /crossdissolve/i.test(String(name).replace(/[^a-z]/gi, ""));
    }).length;
    const fadeUnverifiedSequences = postEdit.rows
      .filter((row) => {
        const transition = row.template && row.template.endTransition;
        const name = transition && (transition.matchName || transition.name || "");
        return !(/cross\s*dissolve/i.test(name) || /crossdissolve/i.test(String(name).replace(/[^a-z]/gi, "")));
      })
      .map((row) => row.sequence.name);
    await scan();
    status("Updated " + updated + " sequence(s): PLACE THE VIDEO and aligned audio reach the shared source-supported end where available; " +
      "PSD ends " + logoSeconds + " seconds before it. Premiere reports Cross Dissolve at the PSD end in " +
      fadeVerified + " sequence(s) of " + postEdit.rows.length + "." +
      (skipped.length ? "\nSkipped:\n" + skipped.join("\n") : "") +
      (fadeFailed.length ? "\nCross Dissolve not confirmed for:\n" + fadeFailed.join("\n") : "") +
      (fadeUnverifiedSequences.length ? "\nCheck PSD end in:\n" + fadeUnverifiedSequences.join(", ") : "") +
      "\n\nIf a sequence is not counted, add Cross Dissolve to the END of its PSD clip on the upper video track (not PLACE THE VIDEO), then inspect the logo scene.");
  } catch (error) {
    status("Edit failed: " + (error.message || error));
  }
}

async function queuePsdSequences() {
  try {
    const project = await ppro.Project.getActiveProject();
    const discovered = await discoverPsdSequences(project);
    const sequences = discovered.rows.map((row) => row.sequence);
    if (sequences.length === 0) throw new Error("No sequences containing PSD clips were found.");
    const encoder = ppro.EncoderManager.getManager();
    if (!encoder.isAMEInstalled) throw new Error("Adobe Media Encoder is not installed.");
    let queued = 0;
    const failed = [];
    for (const sequence of sequences) {
      try {
        const ok = await encoder.exportSequence(
          sequence,
          ppro.Constants.ExportType.QUEUE_TO_AME,
          "",
          "",
          true
        );
        if (ok) queued += 1;
        else failed.push(sequence.name);
      } catch (error) {
        failed.push(sequence.name + ": " + (error.message || error));
      }
    }
    status("Queued " + queued + " of " + sequences.length +
      " sequence(s) containing PSD clips to Adobe Media Encoder." +
      (failed.length ? "\nNot queued:\n" + failed.join("\n") : "") +
      "\n\nReview each AME output path and preset before starting the batch.");
  } catch (error) {
    status("Queue failed: " + (error.message || error));
  }
}

$("scan").addEventListener("click", scan);
$("apply").addEventListener("click", trimTemplatesAndAddFade);
$("queue").addEventListener("click", queuePsdSequences);
