---
title: Control the substrate
description: X long post — you don't have to read the code any more; you have to control the substrate it is written on.
date: 2026-09-26
private: true
channel: x
tags: [launch, ai, standard]
---

Half the timeline decided you don't have to look at code any more.

Half right. You don't have to READ it. You have to control the substrate it's written on.

An AI can write any shape that already exists. It cannot write a shape that doesn't. That's where the moat moved: not to syntax, to the space of moves a codebase makes possible.

An unrestrained space is also a space for bugs. Constrain it and the right move becomes the obvious one. That's what a standard is for, and it lands harder on agents than it ever did on us.

This month, on ivue: a scroll engine that reached native parity on iOS and Android, judged by hand on both phones.

37 animated layers. Planes in real 3D. A flock painted in a worker thread. Pictures that pull into the text and leave again.

Reactive state for all of it: three refs and a frame meter. Everything else is a plain function of one number, because the shape left nowhere else to put it.

The gate caught nine violations on the way in. Every one was right.

So the work didn't disappear. It moved up.

Structural vision is the job now: what must be true here, what can never be true. Write those down as invariants, each with the test that would break it. Hand the agent the shape and the invariants. Then review the invariants, not the diff.

Under both is one method — reduce a thing until only what reality refuses to delete is left. It produced ivue. It produced the scroll engine. It produces the standard the agents write against. It's coming, and it's the bigger half.

Correctness by construction was never about writing less code. It's about deciding what the construction is.
