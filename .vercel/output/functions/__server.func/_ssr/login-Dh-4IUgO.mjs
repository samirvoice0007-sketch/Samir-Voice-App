import { o as __toESM } from "../_runtime.mjs";
import { H as require_react, S as require_jsx_runtime, b as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as createServerFn } from "./ssr.mjs";
import { r as signIn, t as authClient } from "./client-B40BzJxt.mjs";
import { t as GROK_PROVIDERS } from "./server-CMM85LMC.mjs";
import { d as useCurrentUserState, f as useLang, o as createSsrRpc, r as Splash, t as AppFrame } from "./app-shell-1_ZZ4i4K.mjs";
import { t as LangToggle } from "./lang-toggle-BOpFPPV3.mjs";
import { n as Field } from "./field-DocRL8aU.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-Dh-4IUgO.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function GoogleMark({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		className,
		viewBox: "0 0 48 48",
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				fill: "#FFC107",
				d: "M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				fill: "#FF3D00",
				d: "M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				fill: "#4CAF50",
				d: "M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				fill: "#1976D2",
				d: "M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.8-6.6 7.4l6.3 5.3C37.8 38.3 44 32.5 44 24c0-1.2-.1-2.3-.4-3.5z"
			})
		]
	});
}
var sendPhoneOtp = createServerFn({ method: "POST" }).validator((d) => d).handler(createSsrRpc("e7a5ba3775540dd2a76c4697f7664353d4f29c36d6fcae2098cd7944a0e8d215"));
var verifyPhoneOtp = createServerFn({ method: "POST" }).validator((d) => d).handler(createSsrRpc("4bcf7497de85e9041cfa12b88a3daf6ca5e9f8e0cebda7f6fac13bf2ca20baa2"));
function Login() {
	const { user, isPending } = useCurrentUserState();
	const navigate = useNavigate();
	const t = useLang((s) => s.t);
	const [mode, setMode] = (0, import_react.useState)("up");
	const [name, setName] = (0, import_react.useState)("");
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [phone, setPhone] = (0, import_react.useState)("");
	const [otp, setOtp] = (0, import_react.useState)("");
	const [otpSent, setOtpSent] = (0, import_react.useState)(false);
	const [demoCode, setDemoCode] = (0, import_react.useState)("");
	const [err, setErr] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!isPending && user) navigate({ to: "/" });
	}, [
		isPending,
		user,
		navigate
	]);
	if (isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Splash, {});
	if (user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Splash, {});
	async function onGoogle() {
		setErr("");
		setBusy(true);
		try {
			const google = GROK_PROVIDERS.find((p) => p.idp === "google");
			if (!google || false) throw new Error(t("authFailed"));
			await signIn(google.providerId, { callbackURL: "/" });
		} catch (e) {
			setErr(e instanceof Error ? e.message : t("authFailed"));
			setBusy(false);
		}
	}
	async function onX() {
		setErr("");
		setBusy(true);
		try {
			const x = GROK_PROVIDERS.find((p) => p.idp === "twitter");
			if (!x || false) throw new Error(t("authFailed"));
			await signIn(x.providerId, { callbackURL: "/" });
		} catch (e) {
			setErr(e instanceof Error ? e.message : t("authFailed"));
			setBusy(false);
		}
	}
	async function onEmail(e) {
		e.preventDefault();
		setErr("");
		setBusy(true);
		try {
			if (mode === "up") {
				const { error } = await authClient.signUp.email({
					email: email.trim(),
					password,
					name: name.trim() || email.split("@")[0] || "Star"
				});
				if (error) throw new Error(error.message || t("authFailed"));
			} else {
				const { error } = await authClient.signIn.email({
					email: email.trim(),
					password
				});
				if (error) throw new Error(error.message || t("authFailed"));
			}
			navigate({ to: "/" });
		} catch (e) {
			setErr(e instanceof Error ? e.message : t("authFailed"));
		} finally {
			setBusy(false);
		}
	}
	async function onSendOtp() {
		setErr("");
		setBusy(true);
		try {
			const res = await sendPhoneOtp({ data: { phone } });
			setPhone(res.phone);
			setOtpSent(true);
			setDemoCode(res.code);
			setOtp(res.code);
		} catch (e) {
			setErr(e instanceof Error ? e.message : t("invalidPhone"));
		} finally {
			setBusy(false);
		}
	}
	async function onVerifyOtp() {
		setErr("");
		setBusy(true);
		try {
			const creds = await verifyPhoneOtp({ data: {
				phone,
				code: otp,
				displayName: name || void 0
			} });
			if (creds.isNew) {
				const { error } = await authClient.signUp.email({
					email: creds.email,
					password: creds.password,
					name: creds.name
				});
				if (error) {
					const { error: e2 } = await authClient.signIn.email({
						email: creds.email,
						password: creds.password
					});
					if (e2) throw new Error(e2.message || t("authFailed"));
				}
			} else {
				const { error } = await authClient.signIn.email({
					email: creds.email,
					password: creds.password
				});
				if (error) throw new Error(error.message || t("authFailed"));
			}
			navigate({ to: "/" });
		} catch (e) {
			setErr(e instanceof Error ? e.message : t("invalidOtp"));
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppFrame, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "relative min-h-dvh overflow-hidden px-4 pb-10 pt-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none absolute -left-10 -top-6 h-44 w-44 rounded-full",
				style: {
					background: "color-mix(in oklab, var(--color-primary) 35%, transparent)",
					filter: "blur(40px)"
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none absolute -right-8 bottom-24 h-40 w-40 rounded-full",
				style: {
					background: "color-mix(in oklab, var(--color-gold) 25%, transparent)",
					filter: "blur(40px)"
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-[2rem] font-semibold tracking-tight text-primary",
					children: "GF BF"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted",
					children: t("tagline")
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LangToggle, {})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative mt-8 flex flex-col gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						disabled: busy,
						onClick: onGoogle,
						className: "flex min-h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-elevated px-4 text-sm font-semibold text-fg",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GoogleMark, { className: "size-[18px] shrink-0" }), t("continueGoogle")]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: busy,
						onClick: onX,
						className: "flex min-h-11 w-full items-center justify-center rounded-lg border border-border bg-elevated px-4 text-sm font-semibold text-fg",
						children: t("continueX")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2.5 text-xs text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-px flex-1 bg-border" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("orPhone") }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-px flex-1 bg-border" })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						type: "tel",
						inputMode: "tel",
						autoComplete: "tel",
						placeholder: t("phonePlaceholder"),
						value: phone,
						onChange: (e) => setPhone(e.target.value)
					}),
					otpSent ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						demoCode ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "rounded-md border border-border bg-surface px-3 py-2 text-sm text-gold",
							children: [
								t("demoCode"),
								": ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-semibold tabular-nums tracking-widest",
									children: demoCode
								})
							]
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							type: "text",
							inputMode: "numeric",
							maxLength: 6,
							autoComplete: "one-time-code",
							placeholder: t("otp"),
							value: otp,
							onChange: (e) => setOtp(e.target.value)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: busy,
							onClick: onVerifyOtp,
							className: "min-h-11 w-full rounded-lg bg-phone px-4 text-sm font-semibold text-fg",
							children: t("verifyOtp")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: busy,
							onClick: onSendOtp,
							className: "min-h-11 w-full rounded-lg border border-border bg-elevated px-4 text-sm font-semibold text-fg",
							children: t("resendOtp")
						})
					] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: busy,
						onClick: onSendOtp,
						className: "min-h-11 w-full rounded-lg bg-phone px-4 text-sm font-semibold text-fg",
						children: t("sendOtp")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2.5 text-xs text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-px flex-1 bg-border" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("orEmail") }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-px flex-1 bg-border" })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: "flex flex-col gap-3",
						onSubmit: onEmail,
						children: [
							mode === "up" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								placeholder: t("name"),
								autoComplete: "nickname",
								value: name,
								onChange: (e) => setName(e.target.value)
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								type: "email",
								placeholder: t("email"),
								autoComplete: "email",
								value: email,
								onChange: (e) => setEmail(e.target.value),
								required: true
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								type: "password",
								placeholder: t("password"),
								autoComplete: mode === "up" ? "new-password" : "current-password",
								value: password,
								onChange: (e) => setPassword(e.target.value),
								minLength: 8,
								required: true
							}),
							mode === "up" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted",
								children: t("passwordHint")
							}) : null,
							err ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-danger",
								children: err
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "submit",
								disabled: busy,
								className: "min-h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-fg",
								children: mode === "up" ? t("signUp") : t("signIn")
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "min-h-11 w-full rounded-lg border border-border bg-elevated px-4 text-sm font-semibold text-fg",
						onClick: () => {
							setMode(mode === "up" ? "in" : "up");
							setErr("");
						},
						children: mode === "up" ? `${t("haveAccount")} ${t("signIn")}` : `${t("noAccount")} ${t("signUp")}`
					})
				]
			})
		]
	}) });
}
//#endregion
export { Login as component };
