import matplotlib.pyplot as plt
import numpy as np

# Create a unit sphere
u = np.linspace(0, 2 * np.pi, 100)
v = np.linspace(0, np.pi, 100)
x = np.outer(np.cos(u), np.sin(v))
y = np.outer(np.sin(u), np.sin(v))
z = np.outer(np.ones(np.size(u)), np.cos(v))

fig = plt.figure(figsize=(8, 8))
ax = fig.add_subplot(111, projection="3d")

# Plot the surface with wireframe
ax.plot_wireframe(x, y, z, color="gray", alpha=0.2, rstride=5, cstride=5)

# Add a vector representing an emotion (e.g., Compassion: V=0.5, A=0.2, C=0.9)
# Quiver: x, y, z, u, v, w
ax.quiver(
    0,
    0,
    0,
    0.5,
    0.2,
    0.9,
    color="red",
    linewidth=3,
    arrow_length_ratio=0.1,
    label="Emotional Vector",
)

# Set axis limits to standard VAC range [-1, 1]
ax.set_xlim([-1, 1])
ax.set_ylim([-1, 1])
ax.set_zlim([-1, 1])

# Add axis labels
ax.set_xlabel("Valence (X)")
ax.set_ylabel("Arousal (Y)")
ax.set_zlabel("Connection (Z)")

# Title
ax.set_title("Soul Sphere Visualization Interface\n(Conceptual Representation - VAC Range [-1, 1])")

# Save
plt.savefig("docs/figures/fig5.png", dpi=300)
print("Generated docs/figures/fig5.png with VAC range [-1, 1]")
