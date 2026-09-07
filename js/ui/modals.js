import { TERM_CONTRACT } from "../content-contract.js";
import { copyText } from "./feedback.js";

export function createContributionModals({ contributions, client: sb }) {
    async function copyFallback(result) {
        if (!result.copy) return result;
        return { ...result, ok: await copyText(result.copy) };
    }
    const select = document.getElementById("sub-category");
    select.replaceChildren(new Option("Choose a category", ""));
    TERM_CONTRACT.categories.forEach(category => select.appendChild(new Option(category[0].toUpperCase() + category.slice(1), category)));
    const submitTrigger = document.getElementById("submit-trigger");
    const submitModal = document.getElementById("submit-modal");
    const submitModalClose = document.getElementById("submit-modal-close");
    const submitBackdrop = document.getElementById("submit-modal-backdrop");
    const submitForm = document.getElementById("submit-form");
    const submitButton = document.getElementById("sub-submit");
    const submitStatus = document.getElementById("sub-status");
    const submitTitle = document.getElementById("submit-modal-title");
    const submitDescription = document.getElementById("submit-modal-description");
    const submitTermContext = document.getElementById("submit-term-context");
    const submitTermName = document.getElementById("submit-term-name");
    const definitionInput = document.getElementById("sub-definition");
    const definitionLabel = document.getElementById("sub-definition-label");
    const definitionHint = document.getElementById("sub-definition-hint");
    const definitionCount = document.getElementById("sub-definition-count");
    let returnFocus = null;
    let submissionMode = "new";
    let correctedTerm = null;
    let submitGeneration = 0;
    let reportGeneration = 0;
    let submitPending = false;
    let reportPending = false;
    let submitCloseTimer;
    let reportCloseTimer;

    if (!sb.enabled) {
        submitDescription.textContent = "Online review is temporarily unavailable. Complete the form to copy a formatted submission you can share with the project maintainer.";
        submitButton.textContent = "Copy Submission";
    }

    function updateDefinitionCount() {
        if (definitionCount && definitionInput) definitionCount.textContent = `${definitionInput.value.length} / ${TERM_CONTRACT.limits.definitionMax}`;
    }

    function openSubmitModal(term = null) {
        if (!submitModal) return;
        submitGeneration += 1;
        clearTimeout(submitCloseTimer);
        correctedTerm = term;
        submitButton.disabled = submitPending;
        returnFocus = document.activeElement;
        submitForm?.reset();
        submissionMode = term ? "correction" : "new";
        submitModal.classList.toggle("is-correction", Boolean(term));
        submitForm?.querySelectorAll("[data-new-submission-field]").forEach(element => {
            element.hidden = Boolean(term);
        });
        if (submitTermContext) submitTermContext.hidden = !term;
        if (submitTermName) submitTermName.textContent = term?.name || "";
        if (term) {
            submitTitle.textContent = "Suggest an Edit";
            submitDescription.textContent = "Describe what should change or provide clearer wording. Suggestions never alter a published term automatically.";
            definitionLabel.innerHTML = 'Suggested change <span aria-hidden="true">*</span>';
            definitionHint.textContent = "Point to the issue and suggest replacement wording when possible.";
            document.getElementById("sub-name").value = term.name;
            document.getElementById("sub-category").value = term.category;
            document.getElementById("sub-aliases").value = (term.aliases || []).join(", ");
            document.getElementById("sub-tags").value = (term.tags || []).join(", ");
            definitionInput.value = `Correction for the published term “${term.name}”:\n\nWhat should change and why:\n`;
        } else {
            submitTitle.textContent = "Submit a Term";
            submitDescription.textContent = sb.enabled
                ? "Submissions are reviewed before publication. They never change the published glossary automatically."
                : "Online review is temporarily unavailable. Complete the form to copy a formatted submission you can share with the project maintainer.";
            definitionLabel.innerHTML = 'Definition <span aria-hidden="true">*</span>';
            definitionHint.textContent = "Start with a plain-language meaning, then explain why it matters. Markdown is supported.";
        }
        submitButton.textContent = sb.enabled ? (term ? "Send Suggestion" : "Submit for Review") : (term ? "Copy Suggestion" : "Copy Submission");
        updateDefinitionCount();
        submitModal.hidden = false;
        document.body.style.overflow = "hidden";
        submitStatus.hidden = true;
        (term ? definitionInput : document.getElementById("sub-name"))?.focus();
    }

    function closeSubmitModal() {
        if (!submitModal) return;
        submitGeneration += 1;
        clearTimeout(submitCloseTimer);
        submitModal.hidden = true;
        document.body.style.overflow = "";
        submitStatus.hidden = true;
        returnFocus?.focus?.();
    }

    submitTrigger?.addEventListener("click", () => openSubmitModal());
    
    submitModalClose?.addEventListener("click", closeSubmitModal);
    submitBackdrop?.addEventListener("click", closeSubmitModal);
    definitionInput?.addEventListener("input", updateDefinitionCount);

    document.addEventListener("keydown", event => trapDialogFocus(event, submitModal, closeSubmitModal));

    submitForm?.addEventListener("submit", async event => {
        event.preventDefault();
        if (submitPending || !submitForm.reportValidity()) return;
        submitPending = true;
        const generation = submitGeneration;

        submitButton.disabled = true;
        submitButton.textContent = sb.enabled ? "Submitting…" : "Copying…";
        let result;
        try {
            result = await contributions.submitTerm({
                kind: submissionMode,
                termId: correctedTerm?.id,
                name: document.getElementById("sub-name").value,
                category: document.getElementById("sub-category").value,
                aliases: document.getElementById("sub-aliases").value,
                tags: document.getElementById("sub-tags").value,
                definition: document.getElementById("sub-definition").value,
                website: document.getElementById("sub-website").value
            });
            if (generation !== submitGeneration) return;
            // Clipboard permission may resolve much later than the HTTP call.
            // Keep the whole action serialized until that fallback finishes.
            result = await copyFallback(result);
        } finally {
            submitPending = false;
            submitButton.disabled = false;
        }
        if (generation !== submitGeneration) return;
        submitStatus.hidden = false;
        if (result.ok && result.sent) {
            submitStatus.textContent = submissionMode === "correction"
                ? "Edit suggestion submitted. It will be reviewed before any published definition changes."
                : "Submitted successfully. Your term will appear only after review.";
            submitStatus.style.color = "var(--accent)";
            submitForm.reset();
            updateDefinitionCount();
            submitCloseTimer = setTimeout(() => { if (generation === submitGeneration) closeSubmitModal(); }, 1800);
        } else if (result.ok) {
            submitStatus.textContent = `${result.reason} A copy was placed on your clipboard; online delivery was not confirmed.`;
            submitStatus.style.color = "var(--accent)";
        } else {
            submitStatus.textContent = `${result.reason || "Submission could not be processed."} Your form has been kept so you can try again.`;
            submitStatus.style.color = "var(--warning)";
        }

        submitButton.disabled = false;
        submitButton.textContent = sb.enabled
            ? (submissionMode === "correction" ? "Send Suggestion" : "Submit for Review")
            : (submissionMode === "correction" ? "Copy Suggestion" : "Copy Submission");
    });

    const reportModal = document.getElementById("report-modal");
    const reportModalClose = document.getElementById("report-modal-close");
    const reportBackdrop = document.getElementById("report-modal-backdrop");
    const reportForm = document.getElementById("report-form");
    const reportButton = document.getElementById("report-submit");
    const reportStatus = document.getElementById("report-status");
    const reportReason = document.getElementById("report-reason");
    const reportDetails = document.getElementById("report-details");
    const reportDetailsCount = document.getElementById("report-details-count");
    const reportTermName = document.getElementById("report-term-name");
    let reportReturnFocus = null;
    let reportedTerm = null;

    if (!sb.enabled && reportButton) reportButton.textContent = "Copy Report";

    function updateReportDetails() {
        if (reportDetailsCount && reportDetails) reportDetailsCount.textContent = `${reportDetails.value.length} / 2000`;
        if (reportDetails && reportReason) reportDetails.required = reportReason.value === "other";
    }

    function openReportModal(term) {
        if (!reportModal || !term) return;
        reportGeneration += 1;
        clearTimeout(reportCloseTimer);
        reportButton.disabled = reportPending;
        reportReturnFocus = document.activeElement;
        reportedTerm = term;
        reportForm?.reset();
        reportTermName.textContent = term.name;
        reportStatus.hidden = true;
        reportButton.textContent = sb.enabled ? "Send Report" : "Copy Report";
        updateReportDetails();
        reportModal.hidden = false;
        document.body.style.overflow = "hidden";
        reportReason?.focus();
    }

    function closeReportModal() {
        if (!reportModal) return;
        reportGeneration += 1;
        clearTimeout(reportCloseTimer);
        reportModal.hidden = true;
        document.body.style.overflow = "";
        reportStatus.hidden = true;
        reportedTerm = null;
        reportReturnFocus?.focus?.();
    }

    
    reportModalClose?.addEventListener("click", closeReportModal);
    reportBackdrop?.addEventListener("click", closeReportModal);
    reportReason?.addEventListener("change", updateReportDetails);
    reportDetails?.addEventListener("input", updateReportDetails);

    document.addEventListener("keydown", event => trapDialogFocus(event, reportModal, closeReportModal));

    reportForm?.addEventListener("submit", async event => {
        event.preventDefault();
        updateReportDetails();
        if (reportPending || !reportForm.reportValidity() || !reportedTerm) return;
        reportPending = true;
        const generation = reportGeneration;

        reportButton.disabled = true;
        reportButton.textContent = sb.enabled ? "Sending…" : "Copying…";
        let result;
        try {
            result = await contributions.submitReport({
                termId: reportedTerm.id,
                termName: reportedTerm.name,
                reason: reportReason.value,
                details: reportDetails.value,
                website: document.getElementById("report-website").value
            });
            if (generation !== reportGeneration) return;
            result = await copyFallback(result);
        } finally {
            reportPending = false;
            reportButton.disabled = false;
        }
        if (generation !== reportGeneration) return;
        reportStatus.hidden = false;
        if (result.ok && result.sent) {
            reportStatus.textContent = result.created
                ? "Report sent. A maintainer will review it privately."
                : "This report is already in the review queue.";
            reportStatus.style.color = "var(--accent)";
            reportForm.reset();
            updateReportDetails();
            reportCloseTimer = setTimeout(() => { if (generation === reportGeneration) closeReportModal(); }, 1800);
        } else if (result.ok) {
            reportStatus.textContent = `${result.reason} A copy was placed on your clipboard; online delivery was not confirmed.`;
            reportStatus.style.color = "var(--accent)";
        } else {
            reportStatus.textContent = `${result.reason || "Report could not be processed."} Your form has been kept so you can try again.`;
            reportStatus.style.color = "var(--warning)";
        }

        reportButton.disabled = false;
        reportButton.textContent = sb.enabled ? "Send Report" : "Copy Report";
    });

    return { openSubmit: openSubmitModal, openReport: openReportModal, closeSubmit: closeSubmitModal, closeReport: closeReportModal };
}

// Both moderation dialogs share the same keyboard/focus contract.
function trapDialogFocus(event, modal, close) {
    if (!modal || modal.hidden) return;
    if (event.key === "Escape") { event.preventDefault(); close(); return; }
    if (event.key !== "Tab") return;
    const items = [...modal.querySelectorAll("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary")]
        .filter(element => element.tabIndex >= 0 && element.checkVisibility());
    if (!items.length) return;
    const first = items[0], last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}
