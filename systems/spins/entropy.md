# What the rising curve means

The ensemble starts in a single known macrostate — all chains all-up, so $\Pr(M)$ is one
spike and $S = -\sum_M \Pr(M)\log_2\Pr(M) = 0$: complete knowledge, zero entropy. The
random single-spin flips are **symmetric** (every microstate transition is as likely as
its reverse), so the dynamics drift toward the uniform distribution over all $2^\ell$
microstates. There $\Pr(M)$ is the exact binomial of the CLT page, and the entropy
saturates at its steady-state value — this is the second law, $dS \ge 0$ on average,
emerging from reversible microscopic rules.

Three things to try: start from *all ↓* ($\bar M$ relaxes from the other side, $S(t)$ is
the same — entropy does not care about the sign of $M$); start from *random* (the ensemble
is born equilibrated: $S$ starts at the plateau); shrink the ensemble $N$ (the sampled
$\Pr(M)$ gets noisy and $S(t)$ fluctuates *below* the steady line — a finite-sample
effect, not physics).

Note this $S$ is the Shannon entropy (in bits) of the *magnetization* distribution, the
object used in the course exercise — not $k_B\ln W$ of a microstate count, which lives on
the Ensembles page.

*Source: numerical_ex_1_ans.ipynb, Section 2; ergodicity context in Lecture notes 2 pp.1–2.*
