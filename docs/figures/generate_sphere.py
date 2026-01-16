import matplotlib.pyplot as plt
import numpy as np

# Create a sphere
theta = np.linspace(0, 2 * np.pi, 100)
phi = np.linspace(0, np.pi, 100)
x = 10 * np.outer(np.cos(theta), np.sin(phi))
y = 10 * np.outer(np.sin(theta), np.sin(phi))
z = 10 * np.outer(np.ones(np.size(theta)), np.cos(phi))

fig = plt.figure(figsize=(8, 8))
ax = fig.add_subplot(111, projection='3d')

# Plot the surface with wireframe
ax.plot_wireframe(x, y, z, color='gray', alpha=0.3, rstride=5, cstride=5)

# Add some "Soul Sphere" elements - a glowing core or vector
# Let's draw a vector representing an emotion
ax.quiver(0, 0, 0, 8, 5, 5, color='red', linewidth=3, arrow_length_ratio=0.1, label='Emotional Vector')

# Add axis labels
ax.set_xlabel('Valence (X)')
ax.set_ylabel('Arousal (Y)')
ax.set_zlabel('Connection (Z)')

# Title
ax.set_title('Soul Sphere Visualization Interface\n(Conceptual Representation)')

# Remove grid background for cleaner look if possible, but standard is fine
# ax.axis('off')

# Save
plt.savefig('docs/figures/fig5.png', dpi=300)
print("Generated docs/figures/fig5.png")
